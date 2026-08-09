import { calculatePoints } from "@/lib/game/scoring";
import type { ChallengeQuestionPublic, ChallengeQuestionSnapshot } from "@/types/database";

export type ChallengeAnswerInput = {
  questionId: string;
  selectedOption: string | null;
  timeMs: number;
};

export type ChallengeScoreResult = {
  score: number;
  correct: number;
  totalTimeMs: number;
};

export function scoreChallengeAnswers(
  questions: ChallengeQuestionSnapshot[],
  answers: ChallengeAnswerInput[]
): ChallengeScoreResult {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
  let streak = 0;
  let score = 0;
  let correct = 0;
  let totalTimeMs = 0;

  for (const question of questions) {
    const answer = answerMap.get(question.id);
    const timeMs = answer?.timeMs ?? 0;
    totalTimeMs += timeMs;
    const isCorrect = answer?.selectedOption != null && answer.selectedOption === question.correct_option;
    streak = isCorrect ? streak + 1 : 0;
    if (isCorrect) correct += 1;
    score += calculatePoints({
      difficulty: question.difficulty,
      timeMs,
      correct: isCorrect,
      streakAfterAnswer: streak,
    });
  }

  return { score, correct, totalTimeMs };
}

export function toPublicQuestions(questions: ChallengeQuestionSnapshot[]): ChallengeQuestionPublic[] {
  return questions.map((question) => ({
    id: question.id,
    question_text: question.question_text,
    options: question.options,
    difficulty: question.difficulty,
    genre: question.genre,
    question_type: question.question_type,
  }));
}

export const POINTS_AT_STAKE_OPTIONS = [50, 100, 250, 500] as const;

export function getShareUrl(shareToken: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.blastriff.com";
  return `${base.replace(/\/$/, "")}/c/${shareToken}`;
}
