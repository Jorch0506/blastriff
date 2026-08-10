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
 * The fact-checker is forced (via tool_choice) to make at least one real
 * web_search call before answering, so it verifies against live sources
 * instead of leaning on the model's internal (and possibly stale or
 * hallucinated) knowledge. Unclear or contradictory search results produce
 * an UNCERTAIN verdict rather than a forced guess.
 *
 * The `genre` value stored on each row is the short slug ("thrash", not
 * "Thrash Metal") — that's what /play, /dashboard, and /api/questions
 * actually filter on via an exact-match `.eq("genre", genre)`. Using the
 * display label here would silently generate content the live game can
 * never select. See GENRES below.
 *
 * Usage:
 *   npx tsx scripts/generate-questions.ts --genre thrash --difficulty medium --locale en --count 10
 *   npx tsx scripts/generate-questions.ts --genre "Death Metal" --difficulty hard --locale es --count 15 --dry-run
 *   npx tsx scripts/generate-questions.ts --fill-to 15 --dry-run
 *   npx tsx scripts/generate-questions.ts --fill-to 15
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
const FACT_CHECK_MAX_SEARCHES_PER_QUESTION = 3;
const OPTION_LETTERS = ["a", "b", "c", "d"] as const;

// $/MTok. Keep in sync with the model actually used above.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
};

// $10 per 1,000 web_search tool calls (server-side execution), independent of model pricing.
const WEB_SEARCH_COST_PER_CALL_USD = 0.01;

type GenreOption = { slug: string; label: string };

// `slug` is what gets stored in `questions.genre` and is what the live game
// actually queries by (see /play's and /dashboard's GENRES arrays, and
// /api/questions's `.eq("genre", genre)`). `label` is only for prompting the
// model — never stored. Keep slugs in sync with src/lib/onboarding.ts's
// ONBOARDING_GENRES ids.
const GENRES: readonly GenreOption[] = [
  { slug: "thrash", label: "Thrash Metal" },
  { slug: "death", label: "Death Metal" },
  { slug: "black", label: "Black Metal" },
  { slug: "doom", label: "Doom Metal" },
  { slug: "power", label: "Power Metal" },
  { slug: "progressive", label: "Progressive Metal" },
];

const DIFFICULTIES: readonly QuestionDifficulty[] = ["easy", "medium", "hard"];
const LOCALES: readonly Locale[] = ["en", "es"];

// /play hardcodes `language=en` in its fetch to /api/questions and there is
// no language switcher anywhere in the UI yet — "es" content generated today
// would sit unreachable. --fill-to only targets locales in this list until
// that ships. Single-batch mode (--genre/--difficulty/--locale) still
// supports --locale es explicitly if you want to build ahead of the UI.
const FILL_TO_TARGET_LOCALES: readonly Locale[] = ["en"];

const FILL_TO_APPROVAL_THRESHOLD_USD = 80;

type SingleBatchArgs = {
  mode: "single";
  genre: GenreOption;
  difficulty: QuestionDifficulty;
  locale: Locale;
  count: number;
  dryRun: boolean;
};

type FillToArgs = {
  mode: "fill-to";
  target: number;
  dryRun: boolean;
  onlyGenre?: GenreOption;
  onlyDifficulty?: QuestionDifficulty;
};

type CliArgs = SingleBatchArgs | FillToArgs;

function printUsageAndExit(message: string): never {
  console.error(`Error: ${message}`);
  console.error(
    `\nUsage:\n` +
      `  npx tsx scripts/generate-questions.ts --genre thrash --difficulty medium --locale en --count 10 [--dry-run]\n` +
      `  npx tsx scripts/generate-questions.ts --fill-to 15 [--dry-run]\n\n` +
      `  --genre       One of: ${GENRES.map((g) => g.slug).join(", ")} (label like "${GENRES[0].label}" also accepted)\n` +
      `  --difficulty  One of: ${DIFFICULTIES.join(", ")}\n` +
      `  --locale      One of: ${LOCALES.join(", ")}\n` +
      `  --count       1-${MAX_BATCH_SIZE} (batches are capped deliberately — run the script again for more)\n` +
      `  --dry-run     Print estimated call count and cost, make no API or database calls\n` +
      `  --fill-to N   Instead of one batch, read production coverage for every genre x difficulty\n` +
      `                (locales: ${FILL_TO_TARGET_LOCALES.join(", ")}) and top each combination up to N\n` +
      `                verified questions. Always estimates the aggregate cost first; if it exceeds\n` +
      `                $${FILL_TO_APPROVAL_THRESHOLD_USD}, stops without making any API calls. Mutually exclusive with\n` +
      `                --genre/--difficulty/--count/--locale.\n` +
      `  --only-genre / --only-difficulty   With --fill-to, scope the plan to a single genre and/or\n` +
      `                difficulty (e.g. to smoke-test the flow on one combination before approving\n` +
      `                the full aggregate run). Must be used together.`
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

  const fillToInput = raw.get("fill-to");
  if (fillToInput !== undefined) {
    const conflicting = ["genre", "difficulty", "locale", "count"].filter((k) => raw.has(k));
    if (conflicting.length > 0) {
      printUsageAndExit(`--fill-to cannot be combined with --${conflicting.join(", --")}`);
    }
    const target = Number(fillToInput);
    if (!Number.isInteger(target) || target < 1) {
      printUsageAndExit("--fill-to must be a positive integer");
    }

    const onlyGenreInput = raw.get("only-genre");
    const onlyDifficultyInput = raw.get("only-difficulty");
    if ((onlyGenreInput === undefined) !== (onlyDifficultyInput === undefined)) {
      printUsageAndExit("--only-genre and --only-difficulty must be used together");
    }

    let onlyGenre: GenreOption | undefined;
    let onlyDifficulty: QuestionDifficulty | undefined;
    if (onlyGenreInput !== undefined && onlyDifficultyInput !== undefined) {
      onlyGenre = GENRES.find((g) => g.slug === onlyGenreInput.toLowerCase() || g.label.toLowerCase() === onlyGenreInput.toLowerCase());
      if (!onlyGenre) printUsageAndExit(`--only-genre must be one of: ${GENRES.map((g) => g.slug).join(", ")}`);
      onlyDifficulty = DIFFICULTIES.find((d) => d === onlyDifficultyInput.toLowerCase());
      if (!onlyDifficulty) printUsageAndExit(`--only-difficulty must be one of: ${DIFFICULTIES.join(", ")}`);
    }

    return { mode: "fill-to", target, dryRun, onlyGenre, onlyDifficulty };
  }

  const genreInput = raw.get("genre");
  const difficultyInput = raw.get("difficulty");
  const localeInput = raw.get("locale") ?? "en";
  const countInput = raw.get("count") ?? "10";

  if (!genreInput) printUsageAndExit("--genre is required");
  const genre = GENRES.find((g) => g.slug === genreInput.toLowerCase() || g.label.toLowerCase() === genreInput.toLowerCase());
  if (!genre) printUsageAndExit(`--genre must be one of: ${GENRES.map((g) => g.slug).join(", ")}`);

  if (!difficultyInput) printUsageAndExit("--difficulty is required");
  const difficulty = DIFFICULTIES.find((d) => d === difficultyInput.toLowerCase());
  if (!difficulty) printUsageAndExit(`--difficulty must be one of: ${DIFFICULTIES.join(", ")}`);

  const locale = LOCALES.find((l) => l === localeInput.toLowerCase());
  if (!locale) printUsageAndExit(`--locale must be one of: ${LOCALES.join(", ")}`);

  const count = Number(countInput);
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH_SIZE) {
    printUsageAndExit(`--count must be an integer between 1 and ${MAX_BATCH_SIZE}`);
  }

  return { mode: "single", genre, difficulty, locale, count, dryRun };
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

function buildGenerationSystemPrompt(genreLabel: string, difficulty: QuestionDifficulty, locale: Locale): string {
  const difficultyGuidance: Record<QuestionDifficulty, string> = {
    easy: "Facts a casual fan of the genre would know: flagship albums, famous band names, iconic songs.",
    medium: "Facts that take real listening to know: secondary albums, lineup details, notable tours, well-known genre history.",
    hard: "Facts only a dedicated fan or historian would know: niche releases, early lineup changes, specific dates, session musicians, label history.",
  };

  const localeInstructions =
    locale === "es"
      ? "Write question_text, all four options, and the explanation in natural, conversational Spanish the way Spanish-speaking metal fans actually talk — not a stiff literal translation. Band names, album titles, and song titles must stay exactly as released in their original language; never translate a proper noun."
      : "Write everything in English.";

  return `You are a fact-checked trivia writer for Blast Riff, a heavy metal trivia game. Generate original, verifiable multiple-choice trivia questions about the "${genreLabel}" subgenre, calibrated to "${difficulty}" difficulty.

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
  genre: GenreOption,
  difficulty: QuestionDifficulty,
  locale: Locale,
  count: number
): Promise<{ questions: GeneratedQuestion[]; costUsd: number }> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "medium", format: zodOutputFormat(generationResponseSchema) },
    system: buildGenerationSystemPrompt(genre.label, difficulty, locale),
    messages: [{ role: "user", content: `Generate ${count} questions.` }],
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
  source: z.string().nullable(),
  reasoning: z.string(),
});

const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: FACT_CHECK_MAX_SEARCHES_PER_QUESTION,
} as const;

function buildFactCheckSystemPrompt(genreLabel: string): string {
  return `You are an independent fact-checker for "${genreLabel}" heavy metal trivia. You will be given a multiple-choice question with four answer options in an arbitrary order. You are NOT told which option, if any, was previously claimed to be correct.

You MUST use the web_search tool at least once to verify the specific fact the question turns on (e.g. an album title, release date, band member, or lineup change) before answering — do not rely solely on your own knowledge. Search for the specific claim, not just the band name in general. You may search again with a different query if the first results are irrelevant or ambiguous.

Based only on what your search turns up, determine which single option is factually correct:
- If your search results clearly support one option, set determined_option to that option and confidence to "confident". Set source to a brief mention of where you found it (e.g. a site or publication name) — not a full URL.
- If your search results are unclear, don't address this specific fact, or conflict with each other, set determined_option to null and confidence to "uncertain" — do not guess or fall back on unverified prior knowledge.`;
}

type FactCheckResult = {
  verdict: FactCheckVerdict;
  notes: string;
};

async function factCheckQuestion(
  client: Anthropic,
  genreLabel: string,
  questionText: string,
  options: QuestionOption[],
  correctOption: string
): Promise<{ result: FactCheckResult; costUsd: number; searchCount: number }> {
  const optionsBlock = options.map((opt) => `${opt.id}) ${opt.text}`).join("\n");

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    output_config: { effort: "medium", format: zodOutputFormat(factCheckSchema) },
    system: [{ type: "text", text: buildFactCheckSystemPrompt(genreLabel), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `Question: ${questionText}\n\nOptions:\n${optionsBlock}` }],
    tools: [WEB_SEARCH_TOOL],
    // Deliberately NOT forcing tool_choice to "web_search" here. Forcing it applies
    // to every generation step of this request, not just the first — once max_uses
    // is hit the model is still compelled to attempt the (now-erroring) tool and
    // never reaches the structured-output stage. Measured effect: a single
    // fact-check call ballooned to ~248k input tokens (~$1.29) and returned
    // stop_reason "pause_turn" with parsed_output null, which the code below
    // correctly — but expensively — treats as UNCERTAIN. Leaving tool_choice as
    // "auto" and relying on the system prompt's "you MUST search" instruction,
    // backed by the searchCount === 0 fallback below, reproduced a clean single
    // search, a correct verdict, and ~$0.08 in one test run.
  });

  const costUsd = costForUsage(response.usage);
  const searchCount = response.usage.server_tool_use?.web_search_requests ?? 0;

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { result: { verdict: "UNCERTAIN", notes: "Fact-check call was refused or returned no output." }, costUsd, searchCount };
  }

  if (searchCount === 0) {
    return {
      result: { verdict: "UNCERTAIN", notes: "No web search was performed for this fact-check; treating as unverified." },
      costUsd,
      searchCount,
    };
  }

  const { determined_option, confidence, source, reasoning } = response.parsed_output;
  const verdict: FactCheckVerdict =
    confidence === "uncertain" || determined_option === null
      ? "UNCERTAIN"
      : determined_option === correctOption
        ? "VERIFIED_CORRECT"
        : "VERIFIED_INCORRECT";

  const notes = source ? `${reasoning} (source: ${source})` : reasoning;

  return { result: { verdict, notes }, costUsd, searchCount };
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
  server_tool_use?: { web_search_requests: number } | null;
};

function costForUsage(usage: Usage): number {
  const pricing = PRICING[MODEL];
  const cacheCreation = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const inputCost = (usage.input_tokens / 1_000_000) * pricing.input;
  const cacheCreationCost = (cacheCreation / 1_000_000) * pricing.input * 1.25;
  const cacheReadCost = (cacheRead / 1_000_000) * pricing.input * 0.1;
  const outputCost = (usage.output_tokens / 1_000_000) * pricing.output;
  const webSearchCost = (usage.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH_COST_PER_CALL_USD;
  return inputCost + cacheCreationCost + cacheReadCost + outputCost + webSearchCost;
}

function logUsage(label: string, usage: Usage, costUsd: number): void {
  console.log(
    `  [${label}] in=${usage.input_tokens} out=${usage.output_tokens}` +
      `${usage.cache_read_input_tokens ? ` cache_read=${usage.cache_read_input_tokens}` : ""}` +
      `${usage.server_tool_use?.web_search_requests ? ` searches=${usage.server_tool_use.web_search_requests}` : ""}` +
      ` ~$${costUsd.toFixed(4)}`
  );
}

// Rough per-call estimates — actual spend varies with adaptive thinking and how
// many search rounds each fact-check needs. Shared by single-batch --dry-run
// and --fill-to's aggregate estimate so the two numbers never drift apart.
const ESTIMATE = {
  generationInputTokens: 650,
  generationOutputTokensPerQuestion: 550,
  // Each web_search_result block carries a large encrypted_content blob (needed
  // for citations) alongside title/url — that blob is billed as ordinary input
  // tokens. Measured on a real single-search fact-check call: ~14k input
  // tokens, ~190 output tokens. Padded for questions needing a second search.
  factCheckInputTokens: 14_000,
  factCheckOutputTokens: 250,
  searchesPerQuestion: 1.3,
};

type BatchCostEstimate = {
  count: number;
  generationCost: number;
  factCheckCost: number;
  factCheckSearchCost: number;
  estimatedSearches: number;
  totalCost: number;
};

function estimateBatchCost(count: number): BatchCostEstimate {
  const pricing = PRICING[MODEL];

  const generationOutputTokens = ESTIMATE.generationOutputTokensPerQuestion * count;
  const generationCost =
    (ESTIMATE.generationInputTokens / 1_000_000) * pricing.input + (generationOutputTokens / 1_000_000) * pricing.output;

  const factCheckModelCostPerCall =
    (ESTIMATE.factCheckInputTokens / 1_000_000) * pricing.input + (ESTIMATE.factCheckOutputTokens / 1_000_000) * pricing.output;
  const factCheckSearchCostPerCall = ESTIMATE.searchesPerQuestion * WEB_SEARCH_COST_PER_CALL_USD;
  const factCheckCost = (factCheckModelCostPerCall + factCheckSearchCostPerCall) * count;
  const factCheckSearchCost = factCheckSearchCostPerCall * count;

  return {
    count,
    generationCost,
    factCheckCost,
    factCheckSearchCost,
    estimatedSearches: Math.round(ESTIMATE.searchesPerQuestion * count),
    totalCost: generationCost + factCheckCost,
  };
}

function estimateSingleBatchDryRun(args: SingleBatchArgs): void {
  const estimate = estimateBatchCost(args.count);
  const totalCalls = 1 + args.count;

  console.log(`Dry run for ${args.count}x "${args.genre.label}" (${args.genre.slug}) / ${args.difficulty} / ${args.locale}:`);
  console.log(`  API calls: 1 generation + ${args.count} fact-checks = ${totalCalls} calls (model: ${MODEL})`);
  console.log(
    `  Estimated web searches: ~${estimate.estimatedSearches} (~${ESTIMATE.searchesPerQuestion}/question, $${WEB_SEARCH_COST_PER_CALL_USD.toFixed(2)} each) ~$${estimate.factCheckSearchCost.toFixed(4)}`
  );
  console.log(
    `  Estimated cost: ~$${estimate.totalCost.toFixed(4)} (generation ~$${estimate.generationCost.toFixed(4)}, fact-check ~$${estimate.factCheckCost.toFixed(4)} incl. search)`
  );
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
// Shared batch runner (used by both single-batch mode and --fill-to)
// ---------------------------------------------------------------------------

async function runGenerationBatch(
  anthropic: Anthropic,
  supabase: ReturnType<typeof createAdminClient>,
  genre: GenreOption,
  difficulty: QuestionDifficulty,
  locale: Locale,
  count: number
): Promise<{ pendingCount: number; needsReviewCount: number; costUsd: number; batchId: string }> {
  const batchId = randomUUID();
  let totalCostUsd = 0;

  console.log(`\nGenerating ${count} questions — ${genre.label} (${genre.slug}) / ${difficulty} / ${locale} (batch ${batchId})`);
  const { questions: generated, costUsd: generationCost } = await generateBatch(anthropic, genre, difficulty, locale, count);
  totalCostUsd += generationCost;

  const validated = generated.filter((q) => {
    const texts = new Set([q.option_a, q.option_b, q.option_c, q.option_d]);
    if (texts.size !== 4) {
      console.warn(`  Skipping malformed question (duplicate options): "${q.question_text.slice(0, 60)}..."`);
      return false;
    }
    return true;
  });
  console.log(`Generated ${validated.length}/${count} valid questions. Running fact-check (concurrency=${FACT_CHECK_CONCURRENCY})...`);

  const prepared = validated.map((q) => {
    const { options, correctOption } = shuffleOptions(q);
    return { source: q, options, correctOption };
  });

  const factChecked = await mapWithConcurrency(prepared, FACT_CHECK_CONCURRENCY, async (item, index) => {
    const { result, costUsd, searchCount } = await factCheckQuestion(
      anthropic,
      genre.label,
      item.source.question_text,
      item.options,
      item.correctOption
    );
    totalCostUsd += costUsd;
    console.log(
      `  [${index + 1}/${prepared.length}] ${result.verdict} (${searchCount} search${searchCount === 1 ? "" : "es"}) — "${item.source.question_text.slice(0, 60)}..."`
    );
    return { ...item, factCheck: result };
  });

  const rows: Database["public"]["Tables"]["questions_pending_review"]["Insert"][] = factChecked.map((item) => {
    const status: PendingQuestionStatus = item.factCheck.verdict === "VERIFIED_CORRECT" ? "pending" : "needs_review";
    return {
      question_text: item.source.question_text,
      options: item.options,
      correct_option: item.correctOption,
      explanation: item.source.explanation,
      difficulty,
      genre: genre.slug,
      question_type: "multiple_choice",
      tags: [genre.slug],
      language: locale,
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

  console.log(`Inserted ${rows.length} rows (batch ${batchId}): ${pendingCount} pending, ${needsReviewCount} needs_review. ~$${totalCostUsd.toFixed(4)}`);

  return { pendingCount, needsReviewCount, costUsd: totalCostUsd, batchId };
}

// ---------------------------------------------------------------------------
// --fill-to mode
// ---------------------------------------------------------------------------

type FillGap = { genre: GenreOption; difficulty: QuestionDifficulty; locale: Locale; current: number; gap: number };

async function getProductionCoverage(supabase: ReturnType<typeof createAdminClient>): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("questions").select("genre, difficulty, language").eq("verified", true);
  if (error) {
    throw new Error(`Failed to read production coverage: ${error.message}`);
  }
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = `${row.genre}|${row.difficulty}|${row.language}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function computeFillGaps(counts: Map<string, number>, target: number): FillGap[] {
  const gaps: FillGap[] = [];
  for (const genre of GENRES) {
    for (const difficulty of DIFFICULTIES) {
      for (const locale of FILL_TO_TARGET_LOCALES) {
        const current = counts.get(`${genre.slug}|${difficulty}|${locale}`) ?? 0;
        const gap = Math.max(0, target - current);
        if (gap > 0) {
          gaps.push({ genre, difficulty, locale, current, gap });
        }
      }
    }
  }
  return gaps;
}

function printFillPlan(gaps: FillGap[], target: number): { totalQuestions: number; totalCost: number } {
  console.log(`\n--fill-to ${target}: reading production coverage for ${GENRES.length} genres x ${DIFFICULTIES.length} difficulties x locales [${FILL_TO_TARGET_LOCALES.join(", ")}]...`);
  console.log(`${gaps.length} combination(s) below target:\n`);

  let totalQuestions = 0;
  let totalCost = 0;
  for (const gap of gaps) {
    const estimate = estimateBatchCost(gap.gap);
    totalQuestions += gap.gap;
    totalCost += estimate.totalCost;
    console.log(
      `  ${gap.genre.slug.padEnd(12)} ${gap.difficulty.padEnd(8)} ${gap.locale}  ${String(gap.current).padStart(2)} -> ${target}  (+${gap.gap})  ~$${estimate.totalCost.toFixed(2)}`
    );
  }

  console.log(`\nTotal: ${totalQuestions} questions needed across ${gaps.length} combination(s).`);
  console.log(`Estimated aggregate cost: ~$${totalCost.toFixed(2)}`);

  return { totalQuestions, totalCost };
}

async function runFillTo(args: FillToArgs): Promise<void> {
  const supabase = createAdminClient();
  const counts = await getProductionCoverage(supabase);
  let gaps = computeFillGaps(counts, args.target);

  if (args.onlyGenre && args.onlyDifficulty) {
    console.log(`Scoped to a single combination: ${args.onlyGenre.slug} / ${args.onlyDifficulty} (smoke test — full plan not shown).`);
    gaps = gaps.filter((g) => g.genre.slug === args.onlyGenre!.slug && g.difficulty === args.onlyDifficulty);
  }

  if (gaps.length === 0) {
    console.log(`\nAll ${GENRES.length} genres x ${DIFFICULTIES.length} difficulties x locales [${FILL_TO_TARGET_LOCALES.join(", ")}] already have >= ${args.target} verified questions. Nothing to do.`);
    return;
  }

  const { totalCost } = printFillPlan(gaps, args.target);

  if (args.dryRun) {
    console.log(`\nNo API calls made, no database writes made.`);
    return;
  }

  if (totalCost > FILL_TO_APPROVAL_THRESHOLD_USD) {
    console.log(
      `\nEstimated cost ~$${totalCost.toFixed(2)} exceeds the $${FILL_TO_APPROVAL_THRESHOLD_USD} approval threshold. Stopping before making any API calls or database writes.`
    );
    console.log(`Re-run with --dry-run to review the plan, and only drop --dry-run once you've approved the spend.`);
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — check .env.local.");
  }
  const anthropic = new Anthropic();

  console.log(`\nEstimated cost ~$${totalCost.toFixed(2)} is within the $${FILL_TO_APPROVAL_THRESHOLD_USD} threshold. Proceeding...`);

  let grandTotalCost = 0;
  let grandTotalPending = 0;
  let grandTotalNeedsReview = 0;

  for (const gap of gaps) {
    let remaining = gap.gap;
    while (remaining > 0) {
      const chunkSize = Math.min(remaining, MAX_BATCH_SIZE);
      const result = await runGenerationBatch(anthropic, supabase, gap.genre, gap.difficulty, gap.locale, chunkSize);
      grandTotalCost += result.costUsd;
      grandTotalPending += result.pendingCount;
      grandTotalNeedsReview += result.needsReviewCount;
      remaining -= chunkSize;
    }
  }

  console.log(`\n--fill-to ${args.target} done. ${grandTotalPending} pending, ${grandTotalNeedsReview} needs_review. Total cost: ~$${grandTotalCost.toFixed(4)}`);
  console.log(`Review at /admin/questions.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.mode === "fill-to") {
    await runFillTo(args);
    return;
  }

  if (args.dryRun) {
    estimateSingleBatchDryRun(args);
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — check .env.local.");
  }

  const anthropic = new Anthropic();
  const supabase = createAdminClient();
  await runGenerationBatch(anthropic, supabase, args.genre, args.difficulty, args.locale, args.count);
  console.log(`Review at /admin/questions.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
