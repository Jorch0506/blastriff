import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const score = searchParams.get("score") ?? "0";
  const correct = searchParams.get("correct") ?? "0";
  const total = searchParams.get("total") ?? "10";
  const genre = searchParams.get("genre") ?? "metal";
  const username = searchParams.get("username") ?? "METALHEAD";
  const level = searchParams.get("level") ?? "1";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0A",
          backgroundImage: "radial-gradient(circle at top, rgba(204,0,0,0.25), transparent 60%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#CC0000", letterSpacing: 4 }}>
          BLAST RIFF
        </div>
        <div style={{ display: "flex", fontSize: 140, fontWeight: 800, color: "#FFD700", marginTop: 24 }}>
          {score} TP
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#F5F5F5", marginTop: 12 }}>
          {username} · Level {level} · {correct}/{total} correct · {genre.toUpperCase()}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#888888", marginTop: 40, letterSpacing: 2 }}>
          CAN YOU BEAT THIS?
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
