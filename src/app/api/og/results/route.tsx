import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const GENRE_EMOJI: Record<string, string> = {
  thrash: "⚡",
  death: "💀",
  black: "🐺",
  doom: "⛓️",
  power: "🔥",
  progressive: "🎸",
  all: "🤘",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const score = searchParams.get("score") ?? "0";
  const correct = searchParams.get("correct") ?? "0";
  const total = searchParams.get("total") ?? "10";
  const genre = searchParams.get("genre") ?? "metal";
  const username = (searchParams.get("username") ?? "METALHEAD").toUpperCase();
  const level = searchParams.get("level") ?? "1";
  const levelName = (searchParams.get("levelName") ?? "POSEUR").toUpperCase();
  const streakDays = searchParams.get("streakDays") ?? "0";
  const isStory = searchParams.get("format") === "story";

  const width = isStory ? 1080 : 1200;
  const height = isStory ? 1920 : 630;
  const genreEmoji = GENRE_EMOJI[genre] ?? "🤘";

  return new ImageResponse(
    (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#0A0A0A",
          backgroundImage:
            "radial-gradient(circle at top, rgba(204,0,0,0.3), transparent 55%), radial-gradient(circle at bottom, rgba(255,215,0,0.08), transparent 60%)",
          borderTop: "4px solid #CC0000",
          padding: isStory ? "80px 60px" : "48px 64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: isStory ? 48 : 36, fontWeight: 800, color: "#CC0000", letterSpacing: 3 }}>
            BLAST⚡RIFF
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: isStory ? 34 : 24,
              color: "#F5F5F5",
              border: "1px solid #2A2A2A",
              borderRadius: 999,
              padding: "8px 20px",
            }}
          >
            <span>{genreEmoji}</span>
            <span style={{ textTransform: "uppercase" }}>{genre}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: isStory ? 24 : 16,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: isStory ? 220 : 150,
              fontWeight: 800,
              color: "#FFD700",
              lineHeight: 1,
            }}
          >
            {Number(score).toLocaleString()}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: isStory ? 44 : 30,
              fontWeight: 700,
              color: "#FFD700",
              letterSpacing: 4,
            }}
          >
            TRVE POINTS
          </div>
          <div
            style={{
              display: "flex",
              fontSize: isStory ? 42 : 28,
              color: "#F5F5F5",
              marginTop: 8,
              gap: 12,
            }}
          >
            <span>
              {correct}/{total} CORRECT
            </span>
            <span style={{ color: "#888888" }}>·</span>
            <span>
              STREAK {streakDays} 🔥
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%" }}>
          <div style={{ display: "flex", fontSize: isStory ? 40 : 26, fontWeight: 700, color: "#FFD700" }}>
            @{username} · LEVEL {level} · {levelName}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: isStory ? 40 : 26,
              fontWeight: 700,
              color: "#F5F5F5",
              letterSpacing: 2,
            }}
          >
            CAN YOU BEAT THIS?
          </div>
          <div style={{ display: "flex", fontSize: isStory ? 32 : 22, color: "#888888" }}>blastriff.com</div>
        </div>
      </div>
    ),
    { width, height }
  );
}
