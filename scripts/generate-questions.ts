/**
 * Blast Riff — AI question generation pipeline.
 *
 * Generates a batch of trivia questions with Claude, then independently
 * fact-checks each one with a *separate* call that never sees which option
 * was marked correct — it re-derives the answer from the question and
 * options alone, and only afterward do we compare its answer to the
 * generator's claim. That ordering is what makes the check meaningful: a
 * fact-checker that is told "here's the claimed answer, is it right?" tends
 * to anchor on the claim instead of verifying it.
 *
 * Usage:
 *   npx tsx scripts/generate-questions.ts --genre "Thrash Metal" --difficulty medium --locale en --count 10
 *   npx tsx scripts/generate-questions.ts --genre "Death Metal" --difficulty hard --locale es --count 15 --dry-run
 *
 * Not an API route — deliberately only runnable from a trusted machine with
 * the service role key, so it never inserts straight into `questions`.
 * Generated rows land in `questions_pending_review` for human approval via
 * /admin/questions.
 */

import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database, FactCheckVerdict, Locale, PendingQuestionStatus, QuestionDifficulty, QuestionOption } from "../src/types/database";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const MODEL = "claude-opus-5";
const MAX_BATCH_SIZE = 20;
const FACT_CHECK_CONCURRENCY = 3;
const OPTION_LETTERS = ["a", "b", "c", "d"] as const;

// $/MTok. Keep in sync with the model actually used above.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
};

const GENERATION_GENRES = [
  "Thrash Metal",
  "Death Metal",
  "Black Metal",
  "Doom Metal",
  "Power Metal",
  "Progressive Metal",
] as const;

const DIFFICULTIES: readonly QuestionDifficulty[] = ["easy", "medium", "hard"];
const LOCALES: readonly Locale[] = ["en", "es"];

type CliArgs = {
  genre: string;
  difficulty: QuestionDifficulty;
  locale: Locale;
  count: number;
  dryRun: boolean;
};

function printUsageAndExit(message: string): never {
  console.error(`Error: ${message}`);
  console.error(
    `\nUsage:\n  npx tsx scripts/generate-questions.ts --genre "${GENERATION_GENRES[0]}" --difficulty medium --locale en --count 10 [--dry-run]\n\n` +
      `  --genre       One of: ${GENERATION_GENRES.join(", ")}\n` +
      `  --difficulty  One of: ${DIFFICULTIES.join(", ")}\n` +
      `  --locale      One of: ${LOCALES.join(", ")}\n` +
      `  --count       1-${MAX_BATCH_SIZE} (batches are capped deliberately — run the script again for more)\n` +
      `  --dry-run     Print estimated call count and cost, make no API or database calls`
  );
  process.exit(1);
}

function parseArgs(argv: string[]): CliArgs {
  const raw = new Map<string, string>();
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        printUsageAndExit(`missing value for --${key}`);
      }
      raw.set(key, value);
      i++;
    }
  }

  const genreInput = raw.get("genre");
  const difficultyInput = raw.get("difficulty");
  const localeInput = raw.get("locale") ?? "en";
  const countInput = raw.get("count") ?? "10";

  if (!genreInput) printUsageAndExit("--genre is required");
  const genre = GENERATION_GENRES.find((g) => g.toLowerCase() === genreInput.toLowerCase());
  if (!genre) printUsageAndExit(`--genre must be one of: ${GENERATION_GENRES.join(", ")}`);

  if (!difficultyInput) printUsageAndExit("--difficulty is required");
  const difficulty = DIFFICULTIES.find((d) => d === difficultyInput.toLowerCase());
  if (!difficulty) printUsageAndExit(`--difficulty must be one of: ${DIFFICULTIES.join(", ")}`);

  const locale = LOCALES.find((l) => l === localeInput.toLowerCase());
  if (!locale) printUsageAndExit(`--locale must be one of: ${LOCALES.join(", ")}`);

  const count = Number(countInput);
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH_SIZE) {
    printUsageAndExit(`--count must be an integer between 1 and ${MAX_BATCH_SIZE}`);
  }

  return { genre, difficulty, locale, count, dryRun };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

const generatedQuestionSchema = z.object({
  question_text: z.string(),
  option_a: z.string(),
  option_b: z.string(),
  option_c: z.string(),
  option_d: z.string(),
  correct_option: z.enum(["a", "b", "c", "d"]),
  explanation: z.string(),
  related_band: z.string(),
  related_album: z.string().nullable(),
  related_song: z.string().nullable(),
  related_year: z.number().int().nullable(),
});

const generationResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema),
});

type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

function buildGenerationSystemPrompt(genre: string, difficulty: QuestionDifficulty, locale: Locale): string {
  const difficultyGuidance: Record<QuestionDifficulty, string> = {
    easy: "Facts a casual fan of the genre would know: flagship albums, famous band names, iconic songs.",
    medium: "Facts that take real listening to know: secondary albums, lineup details, notable tours, well-known genre history.",
    hard: "Facts only a dedicated fan or historian would know: niche releases, early lineup changes, specific dates, session musicians, label history.",
  };

  const localeInstructions =
    locale === "es"
      ? "Write question_text, all four options, and the explanation in natural, conversational Spanish the way Spanish-speaking metal fans actually talk — not a stiff literal translation. Band names, album titles, and song titles must stay exactly as released in their original language; never translate a proper noun."
      : "Write everything in English.";

  return `You are a fact-checked trivia writer for Blast Riff, a heavy metal trivia game. Generate original, verifiable multiple-choice trivia questions about the "${genre}" subgenre, calibrated to "${difficulty}" difficulty.

Difficulty calibration: ${difficultyGuidance[difficulty]}

Every question must:
- Be about a real band, album, song, band member, or release date that actually exists — never invent a fact.
- Have exactly one objectively correct answer among the four options.
- Have three incorrect options that are plausible within the genre (real bands, albums, or people from the same scene or era) but are clearly wrong to someone who actually knows the correct fact — never absurd or unrelated to the topic.
- Not duplicate the same band, album, or fact as another question in this batch — vary across different bands, eras, and topics (album releases, band formation, lineup changes, iconic songs, genre milestones, real-world events).

${localeInstructions}

related_band is required. Set related_album, related_song, and related_year when the question is directly about that specific album, song, or year; otherwise set them to null.`;
}

async function generateBatch(
  client: Anthropic,
  args: CliArgs
): Promise<{ questions: GeneratedQuestion[]; costUsd: number }> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "medium", format: zodOutputFormat(generationResponseSchema) },
    system: buildGenerationSystemPrompt(args.genre, args.difficulty, args.locale),
    messages: [{ role: "user", content: `Generate ${args.count} questions.` }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(
      `Generation call was refused by Claude's safety classifiers (category: ${response.stop_details?.category ?? "unknown"}). This shouldn't happen for metal trivia — check the prompt.`
    );
  }
  if (!response.parsed_output) {
    throw new Error("Generation call did not return parseable output.");
  }

  const costUsd = costForUsage(response.usage);
  logUsage("Generation", response.usage, costUsd);

  return { questions: response.parsed_output.questions, costUsd };
}

function shuffleOptions(question: GeneratedQuestion): { options: QuestionOption[]; correctOption: string } {
  const texts = [question.option_a, question.option_b, question.option_c, question.option_d];
  const correctIndex = OPTION_LETTERS.indexOf(question.correct_option);
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const options = order.map((originalIndex, newIndex) => ({ id: OPTION_LETTERS[newIndex], text: texts[originalIndex] }));
  const correctOption = OPTION_LETTERS[order.indexOf(correctIndex)];
  return { options, correctOption };
}

// ---------------------------------------------------------------------------
// Fact-checking
// ---------------------------------------------------------------------------

const factCheckSchema = z.object({
  determined_option: z.enum(["a", "b", "c", "d"]).nullable(),
  confidence: z.enum(["confident", "uncertain"]),
  reasoning: z.string(),
});

function buildFactCheckSystemPrompt(genre: string): string {
  return `You are an independent fact-checker for "${genre}" heavy metal trivia. You will be given a multiple-choice question with four answer options in an arbitrary order. You are NOT told which option, if any, was previously claimed to be correct.

Using only your own knowledge, determine which single option is factually correct. If you are not confident enough in your knowledge of this specific fact to commit to one answer, set determined_option to null and confidence to "uncertain" — do not guess.`;
}

type FactCheckResult = {
  verdict: FactCheckVerdict;
  notes: string;
};

async function factCheckQuestion(
  client: Anthropic,
  genre: string,
  questionText: string,
  options: QuestionOption[],
  correctOption: string
): Promise<{ result: FactCheckResult; costUsd: number }> {
  const optionsBlock = options.map((opt) => `${opt.id}) ${opt.text}`).join("\n");

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: "medium", format: zodOutputFormat(factCheckSchema) },
    system: [{ type: "text", text: buildFactCheckSystemPrompt(genre), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `Question: ${questionText}\n\nOptions:\n${optionsBlock}` }],
  });

  const costUsd = costForUsage(response.usage);

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { result: { verdict: "UNCERTAIN", notes: "Fact-check call was refused or returned no output." }, costUsd };
  }

  const { determined_option, confidence, reasoning } = response.parsed_output;
  const verdict: FactCheckVerdict =
    confidence === "uncertain" || determined_option === null
      ? "UNCERTAIN"
      : determined_option === correctOption
        ? "VERIFIED_CORRECT"
        : "VERIFIED_INCORRECT";

  return { result: { verdict, notes: reasoning }, costUsd };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    for (;;) {
      const current = nextIndex++;
      if (current >= items.length) return;
      results[current] = await fn(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

// ---------------------------------------------------------------------------
// Cost / usage accounting
// ---------------------------------------------------------------------------

type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

function costForUsage(usage: Usage): number {
  const pricing = PRICING[MODEL];
  const cacheCreation = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const inputCost = (usage.input_tokens / 1_000_000) * pricing.input;
  const cacheCreationCost = (cacheCreation / 1_000_000) * pricing.input * 1.25;
  const cacheReadCost = (cacheRead / 1_000_000) * pricing.input * 0.1;
  const outputCost = (usage.output_tokens / 1_000_000) * pricing.output;
  return inputCost + cacheCreationCost + cacheReadCost + outputCost;
}

function logUsage(label: string, usage: Usage, costUsd: number): void {
  console.log(
    `  [${label}] in=${usage.input_tokens} out=${usage.output_tokens}` +
      `${usage.cache_read_input_tokens ? ` cache_read=${usage.cache_read_input_tokens}` : ""}` +
      ` ~$${costUsd.toFixed(4)}`
  );
}

function estimateDryRun(args: CliArgs): void {
  const pricing = PRICING[MODEL];
  // Rough per-call estimates — actual spend varies with adaptive thinking.
  const generationInputTokens = 650;
  const generationOutputTokensPerQuestion = 550;
  const factCheckInputTokens = 350;
  const factCheckOutputTokens = 200;

  const generationOutputTokens = generationOutputTokensPerQuestion * args.count;
  const generationCost =
    (generationInputTokens / 1_000_000) * pricing.input + (generationOutputTokens / 1_000_000) * pricing.output;

  const factCheckCostPerCall =
    (factCheckInputTokens / 1_000_000) * pricing.input + (factCheckOutputTokens / 1_000_000) * pricing.output;
  const factCheckTotalCost = factCheckCostPerCall * args.count;

  const totalCalls = 1 + args.count;
  const totalCost = generationCost + factCheckTotalCost;

  console.log(`Dry run for ${args.count}x "${args.genre}" / ${args.difficulty} / ${args.locale}:`);
  console.log(`  API calls: 1 generation + ${args.count} fact-checks = ${totalCalls} calls (model: ${MODEL})`);
  console.log(`  Estimated cost: ~$${totalCost.toFixed(4)} (generation ~$${generationCost.toFixed(4)}, fact-check ~$${factCheckTotalCost.toFixed(4)})`);
  console.log(`  No API calls made, no database writes made.`);
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check .env.local.");
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.dryRun) {
    estimateDryRun(args);
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — check .env.local.");
  }

  const anthropic = new Anthropic();
  const supabase = createAdminClient();
  const batchId = randomUUID();
  let totalCostUsd = 0;

  console.log(`Generating ${args.count} questions — ${args.genre} / ${args.difficulty} / ${args.locale} (batch ${batchId})`);
  const { questions: generated, costUsd: generationCost } = await generateBatch(anthropic, args);
  totalCostUsd += generationCost;

  const validated = generated.filter((q) => {
    const texts = new Set([q.option_a, q.option_b, q.option_c, q.option_d]);
    if (texts.size !== 4) {
      console.warn(`  Skipping malformed question (duplicate options): "${q.question_text.slice(0, 60)}..."`);
      return false;
    }
    return true;
  });
  console.log(`Generated ${validated.length}/${args.count} valid questions. Running fact-check (concurrency=${FACT_CHECK_CONCURRENCY})...`);

  const prepared = validated.map((q) => {
    const { options, correctOption } = shuffleOptions(q);
    return { source: q, options, correctOption };
  });

  const factChecked = await mapWithConcurrency(prepared, FACT_CHECK_CONCURRENCY, async (item, index) => {
    const { result, costUsd } = await factCheckQuestion(
      anthropic,
      args.genre,
      item.source.question_text,
      item.options,
      item.correctOption
    );
    totalCostUsd += costUsd;
    console.log(`  [${index + 1}/${prepared.length}] ${result.verdict} — "${item.source.question_text.slice(0, 60)}..."`);
    return { ...item, factCheck: result };
  });

  const rows: Database["public"]["Tables"]["questions_pending_review"]["Insert"][] = factChecked.map((item) => {
    const status: PendingQuestionStatus = item.factCheck.verdict === "VERIFIED_CORRECT" ? "pending" : "needs_review";
    return {
      question_text: item.source.question_text,
      options: item.options,
      correct_option: item.correctOption,
      explanation: item.source.explanation,
      difficulty: args.difficulty,
      genre: args.genre,
      question_type: "multiple_choice",
      tags: [args.genre.toLowerCase()],
      language: args.locale,
      related_band: item.source.related_band,
      related_album: item.source.related_album,
      related_song: item.source.related_song,
      related_year: item.source.related_year,
      ai_generated: true,
      generation_model: MODEL,
      generation_batch_id: batchId,
      fact_check_model: MODEL,
      fact_check_verdict: item.factCheck.verdict,
      fact_check_notes: item.factCheck.notes,
      status,
    };
  });

  const { error } = await supabase.from("questions_pending_review").insert(rows);
  if (error) {
    throw new Error(`Failed to insert into questions_pending_review: ${error.message}`);
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const needsReviewCount = rows.length - pendingCount;

  console.log(`\nDone. Inserted ${rows.length} rows into questions_pending_review (batch ${batchId}):`);
  console.log(`  ${pendingCount} pending (fact-check agreed — ready for admin review)`);
  console.log(`  ${needsReviewCount} needs_review (fact-check disagreed or was uncertain)`);
  console.log(`Total estimated cost: ~$${totalCostUsd.toFixed(4)}`);
  console.log(`Review at /admin/questions.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
