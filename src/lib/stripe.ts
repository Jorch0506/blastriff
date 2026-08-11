import Stripe from "stripe";

// Fijado explícitamente al default que trae el SDK instalado (stripe@22.4.0,
// ver node_modules/stripe/cjs/apiVersion.js). Evita que un futuro
// `npm update stripe` cambie el comportamiento en silencio si el default
// embebido en el paquete avanza de versión (ver el cambio de forma de
// current_period_end e invoice.subscription entre basil y dahlia).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-07-29.dahlia",
});
