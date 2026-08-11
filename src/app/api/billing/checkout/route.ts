import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

// ENDPOINT DE PRUEBA MÍNIMO — únicamente para generar un checkout.session.completed
// real (con card 4242...) y verificar el webhook de Stripe end-to-end.
// No es la versión final: falta soporte para trve_pass_annual, manejo de
// errores presentable al usuario, protección contra reintentos, etc.
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Inicia sesión primero." }, { status: 401 });
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("Stripe client misconfigured", err);
    return NextResponse.json({ error: "Billing is not configured on this environment." }, { status: 500 });
  }

  const prices = await stripe.prices.list({ lookup_keys: ["trve_pass_monthly"], active: true, limit: 1 });
  const price = prices.data[0];

  if (!price) {
    return NextResponse.json(
      {
        error:
          "No se encontró un Price activo con lookup_key 'trve_pass_monthly' en esta cuenta de Stripe (modo test). Créalo primero en el dashboard de Stripe.",
      },
      { status: 400 }
    );
  }

  const origin = req.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancel`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe no devolvió una URL de checkout." }, { status: 500 });
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
