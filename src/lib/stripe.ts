import Stripe from "stripe";

let cachedClient: Stripe | null = null;

// Instanciación perezosa: Next.js importa este módulo durante "Collecting
// page data" en build time para analizar los route handlers. Si el cliente
// se construyera a nivel de módulo (top-level `new Stripe(...)`), un
// STRIPE_SECRET_KEY ausente en ese momento del build tumba el build
// completo en lugar de fallar en runtime con un error controlado. Con
// lazy init, el build solo importa esta función sin ejecutarla; el error
// de configuración (si lo hay) aparece recién cuando un request real llega
// al handler que llama a getStripe().
export function getStripe(): Stripe {
  if (!cachedClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    // Fijado explícitamente al default que trae el SDK instalado
    // (stripe@22.4.0, ver node_modules/stripe/cjs/apiVersion.js). Evita que
    // un futuro `npm update stripe` cambie el comportamiento en silencio si
    // el default embebido en el paquete avanza de versión (ver el cambio de
    // forma de current_period_end e invoice.subscription entre basil y
    // dahlia).
    cachedClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-07-29.dahlia",
    });
  }
  return cachedClient;
}
