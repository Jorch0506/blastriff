import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs"; // necesitamos el body crudo para verificar la firma; no funciona en Edge

type SubscriptionLookupKey = "trve_pass_monthly" | "trve_pass_annual";
function isPremiumLookupKey(key: string | null): key is SubscriptionLookupKey {
  return key === "trve_pass_monthly" || key === "trve_pass_annual";
}

type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";
const KNOWN_SUBSCRIPTION_STATUSES: readonly string[] = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
];
function isKnownSubscriptionStatus(status: string): status is SubscriptionStatus {
  return KNOWN_SUBSCRIPTION_STATUSES.includes(status);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotencia: insertamos el event.id ANTES de procesar. Si ya existe,
  // es un reintento de Stripe del mismo evento -> no reprocesamos.
  const { error: dedupeError } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (dedupeError) {
    if (dedupeError.code === "23505") {
      return NextResponse.json({ received: true, deduped: true });
    }
    console.error("stripe_events insert failed", dedupeError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(admin, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionWrite(admin, event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(admin, event.data.object as Stripe.Invoice);
        break;
      default:
        break; // evento no manejado, pero ya quedó registrado como recibido
    }
  } catch (err) {
    console.error(`Error processing ${event.type} (${event.id})`, err);
    // Deshacemos el registro de idempotencia para que el reintento automático
    // de Stripe (por el 500 que devolvemos) SÍ vuelva a procesar el evento.
    await admin.from("stripe_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const userId = session.client_reference_id;
  if (!userId) {
    console.error("checkout.session.completed sin client_reference_id", session.id);
    return;
  }
  if (!session.subscription) {
    return; // checkout de un producto que no es suscripción; no aplica aquí
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  await upsertSubscription(admin, userId, subscription);

  await admin.from("profiles").update({ stripe_customer_id: subscription.customer as string }).eq("id", userId);
}

async function handleSubscriptionWrite(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.user_id ?? (await lookupUserIdByCustomer(admin, subscription.customer as string));

  if (!userId) {
    console.error("No se pudo resolver user_id para subscription", subscription.id);
    return;
  }

  await upsertSubscription(admin, userId, subscription);
}

async function lookupUserIdByCustomer(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<string | null> {
  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .limit(1)
    .maybeSingle();
  if (existingSub) return existingSub.user_id;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return profile?.id ?? null;
}

async function upsertSubscription(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  subscription: Stripe.Subscription
) {
  const item = subscription.items.data[0];

  // TEMPORAL: verificar contra un checkout de prueba real que la forma de
  // item coincide con lo asumido en esta versión de la API (2026-07-29.dahlia,
  // posterior a la documentación pública disponible al escribir este código).
  // Quitar este log una vez confirmado en un evento real.
  console.log("[stripe webhook] subscription item shape:", JSON.stringify(item, null, 2));

  const lookupKey = item.price.lookup_key;

  if (!isPremiumLookupKey(lookupKey)) {
    console.error("lookup_key no reconocido", lookupKey, subscription.id);
    return;
  }

  if (!isKnownSubscriptionStatus(subscription.status)) {
    console.error("status de subscription no reconocido", subscription.status, subscription.id);
    return;
  }

  const { data: existing } = await admin
    .from("subscriptions")
    .select("payment_failed_at, grace_period_processed_at")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const isPastDue = subscription.status === "past_due";
  const isTerminal = subscription.status === "canceled" || subscription.status === "unpaid";
  const hadUnresolvedFailure = !!existing?.payment_failed_at && !existing?.grace_period_processed_at;

  // Invariante: payment_failed_at / grace_period_processed_at solo existen
  // mientras status = 'past_due'. La única excepción es cerrar el ciclo
  // inmediatamente si Stripe cancela ANTES de que el sweep de 3 días
  // llegara a procesarlo — así el sweep no vuelve a duplicar la
  // notificación de pérdida de acceso más tarde.
  let paymentFailedAt: string | null;
  let graceProcessedAt: string | null;
  if (isPastDue) {
    paymentFailedAt = existing?.payment_failed_at ?? null;
    graceProcessedAt = existing?.grace_period_processed_at ?? null;
  } else if (isTerminal && hadUnresolvedFailure) {
    paymentFailedAt = existing!.payment_failed_at;
    graceProcessedAt = new Date().toISOString();
  } else {
    paymentFailedAt = null;
    graceProcessedAt = null;
  }

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: item.price.id,
      lookup_key: lookupKey,
      status: subscription.status,
      current_period_end: new Date(item.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      payment_failed_at: paymentFailedAt,
      grace_period_processed_at: graceProcessedAt,
    },
    { onConflict: "stripe_subscription_id" }
  );

  if (error) throw error;

  // recompute_profile_premium se dispara solo via trigger (insert/update/delete
  // en subscriptions), no hace falta llamarlo aquí explícitamente.

  if (isTerminal && hadUnresolvedFailure) {
    await admin.from("notifications").insert({
      user_id: userId,
      type: "premium_access_lost",
      title: "Perdiste tu TRVE PASS",
      body: "Tu suscripción fue cancelada por falta de pago. Reactívala para recuperar el acceso.",
    });
  }
}

async function handlePaymentFailed(admin: ReturnType<typeof createAdminClient>, invoice: Stripe.Invoice) {
  // En apiVersion 2026-07-29.dahlia, invoice.subscription ya no existe a nivel
  // superior: la referencia vive en invoice.parent.subscription_details.subscription.
  const subscriptionRef = invoice.parent?.subscription_details?.subscription ?? null;
  const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id ?? null;
  if (!subscriptionId) return; // factura que no pertenece a una suscripción

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, user_id, payment_failed_at")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!sub) {
    console.error("invoice.payment_failed para subscription desconocida", subscriptionId);
    return;
  }

  if (sub.payment_failed_at !== null) {
    return; // reintento dentro de la misma ventana: no reinicia el reloj, no re-notifica
  }

  const { error, count } = await admin
    .from("subscriptions")
    .update({ payment_failed_at: new Date().toISOString(), grace_period_processed_at: null })
    .eq("id", sub.id)
    .is("payment_failed_at", null); // guarda de carrera ante entregas duplicadas casi simultáneas

  if (error) throw error;
  if (count === 0) return; // otra entrega concurrente ya lo marcó primero

  await admin.from("notifications").insert({
    user_id: sub.user_id,
    type: "payment_failed",
    title: "Tu pago no pudo procesarse",
    body: "Tienes 3 días para actualizar tu método de pago antes de perder tu TRVE PASS.",
  });
}
