"use client";

import { useCallback, useEffect, useState } from "react";
import type { PendingGroup, ProductionCount } from "@/app/api/admin/questions/route";
import type { PendingQuestion, QuestionOption } from "@/types/database";

type QuestionsResponse = { pendingGroups: PendingGroup[]; productionCounts: ProductionCount[] };

type SaveFields = {
  question_text: string;
  explanation: string | null;
  options: QuestionOption[];
  correct_option: string;
};

function verdictColor(verdict: PendingQuestion["fact_check_verdict"]): string {
  if (verdict === "VERIFIED_CORRECT") return "text-success";
  if (verdict === "VERIFIED_INCORRECT") return "text-error";
  return "text-warning";
}

function PendingCard({
  question,
  onApprove,
  onReject,
  onSave,
}: {
  question: PendingQuestion;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onSave: (id: string, fields: SaveFields) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [questionText, setQuestionText] = useState(question.question_text);
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [options, setOptions] = useState<QuestionOption[]>(question.options);
  const [correctOption, setCorrectOption] = useState(question.correct_option);

  async function withBusy(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold uppercase ${verdictColor(question.fact_check_verdict)}`}>
          {question.fact_check_verdict ?? "UNCHECKED"}
        </span>
        <span className="text-xs uppercase text-text-muted">{question.status.replace("_", " ")}</span>
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            className="rounded-lg border border-border bg-surface-elevated p-2 text-sm text-text"
            value={questionText}
            onChange={(event) => setQuestionText(event.target.value)}
            rows={2}
          />
          {options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={correctOption === option.id}
                onChange={() => setCorrectOption(option.id)}
                className="shrink-0"
              />
              <input
                className="flex-1 rounded-lg border border-border bg-surface-elevated p-2 text-sm text-text"
                value={option.text}
                onChange={(event) => {
                  const next = [...options];
                  next[index] = { ...option, text: event.target.value };
                  setOptions(next);
                }}
              />
            </div>
          ))}
          <textarea
            className="rounded-lg border border-border bg-surface-elevated p-2 text-sm text-text-muted"
            placeholder="Explanation"
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                withBusy(async () => {
                  await onSave(question.id, { question_text: questionText, explanation: explanation || null, options, correct_option: correctOption });
                  setEditing(false);
                })
              }
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-text disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="flex-1 rounded-lg border border-border py-2 text-sm text-text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold text-text">{question.question_text}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {question.options.map((option) => (
              <li key={option.id} className={option.id === question.correct_option ? "font-semibold text-gold" : "text-text-muted"}>
                {option.id.toUpperCase()}) {option.text}
              </li>
            ))}
          </ul>
          {question.explanation && <p className="mt-2 text-xs text-text-muted">{question.explanation}</p>}
          {question.fact_check_notes && <p className="mt-2 text-xs italic text-text-muted">Fact-check: {question.fact_check_notes}</p>}

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => withBusy(() => onApprove(question.id))}
              className="rounded-lg bg-success py-2 text-xs font-semibold text-background disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(true)}
              className="rounded-lg border border-border py-2 text-xs font-semibold text-text"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => withBusy(() => onReject(question.id, ""))}
              className="rounded-lg bg-error py-2 text-xs font-semibold text-text disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AdminQuestionsPanel() {
  const [data, setData] = useState<QuestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/questions");
    if (response.ok) {
      setData((await response.json()) as QuestionsResponse);
      setError(false);
    } else {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = useCallback(
    async (id: string) => {
      await fetch(`/api/admin/questions/${id}/approve`, { method: "POST" });
      await load();
    },
    [load]
  );

  const reject = useCallback(
    async (id: string, reason: string) => {
      await fetch(`/api/admin/questions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      await load();
    },
    [load]
  );

  const save = useCallback(
    async (id: string, fields: SaveFields) => {
      await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      await load();
    },
    [load]
  );

  if (loading) {
    return <p className="text-sm text-text-muted">Loading...</p>;
  }
  if (error || !data) {
    return <p className="text-sm text-error">Couldn&apos;t load pending questions.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="font-metal text-lg text-gold">PRODUCTION COVERAGE</h2>
        <p className="mt-1 text-xs text-text-muted">Verified questions currently live, by genre × difficulty × locale. Red means under the 10-question minimum challenges need.</p>
        <div className="mt-3 max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-text-muted">
                <th className="py-1">Genre</th>
                <th className="py-1">Difficulty</th>
                <th className="py-1">Locale</th>
                <th className="py-1 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.productionCounts.map((row) => (
                <tr key={`${row.genre}-${row.difficulty}-${row.language}`} className="border-t border-border">
                  <td className="py-1 text-text">{row.genre}</td>
                  <td className="py-1 text-text-muted">{row.difficulty}</td>
                  <td className="py-1 uppercase text-text-muted">{row.language}</td>
                  <td className={`py-1 text-right font-semibold ${row.count < 10 ? "text-error" : "text-success"}`}>{row.count}</td>
                </tr>
              ))}
              {data.productionCounts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-center text-text-muted">
                    No verified questions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data.pendingGroups.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="font-metal text-lg text-gold">NOTHING TO REVIEW</p>
          <p className="mt-1 text-sm text-text-muted">Run the generation script to fill the queue.</p>
        </div>
      )}

      {data.pendingGroups.map((group) => (
        <div key={`${group.genre}-${group.difficulty}-${group.language}`} className="flex flex-col gap-3">
          <h3 className="font-metal text-sm text-text">
            {group.genre.toUpperCase()} · {group.difficulty.toUpperCase()} · {group.language.toUpperCase()} ({group.questions.length})
          </h3>
          {group.questions.map((question) => (
            <PendingCard key={question.id} question={question} onApprove={approve} onReject={reject} onSave={save} />
          ))}
        </div>
      ))}
    </div>
  );
}
