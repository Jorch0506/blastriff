/**
 * One-off data fix: `questions_pending_review` rows generated before
 * scripts/generate-questions.ts stored `genre` as the display label
 * ("Thrash Metal") instead of the slug the live game actually filters on
 * ("thrash"). Rewrites those rows in place to the correct slug so they can
 * still be approved through /admin/questions instead of being discarded.
 *
 * Only touches `questions_pending_review` (never-shipped pipeline staging
 * data) — the live `questions` table is untouched.
 *
 * Usage:
 *   npx tsx scripts/normalize-pending-genre.ts --dry-run
 *   npx tsx scripts/normalize-pending-genre.ts
 */
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const LABEL_TO_SLUG: Record<string, string> = {
  "Thrash Metal": "thrash",
  "Death Metal": "death",
  "Black Metal": "black",
  "Doom Metal": "doom",
  "Power Metal": "power",
  "Progressive Metal": "progressive",
};

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check .env.local.");
  return createSupabaseClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = createAdminClient();

  const labels = Object.keys(LABEL_TO_SLUG);
  const { data, error } = await db.from("questions_pending_review").select("id, genre").in("genre", labels);
  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    console.log("No questions_pending_review rows found with a display-label genre. Nothing to do.");
    return;
  }

  const byLabel = new Map<string, string[]>();
  for (const row of data) {
    const ids = byLabel.get(row.genre) ?? [];
    ids.push(row.id);
    byLabel.set(row.genre, ids);
  }

  console.log(`Found ${data.length} row(s) to normalize:`);
  for (const [label, ids] of Array.from(byLabel.entries())) {
    console.log(`  "${label}" -> "${LABEL_TO_SLUG[label]}"  (${ids.length} row${ids.length === 1 ? "" : "s"})`);
  }

  if (dryRun) {
    console.log("\n--dry-run: no rows updated.");
    return;
  }

  for (const [label, ids] of Array.from(byLabel.entries())) {
    const slug = LABEL_TO_SLUG[label];
    const { error: updateError } = await db.from("questions_pending_review").update({ genre: slug }).in("id", ids);
    if (updateError) throw new Error(`Failed to update rows for "${label}": ${updateError.message}`);
    console.log(`Updated ${ids.length} row(s): "${label}" -> "${slug}"`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
