import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenger = (searchParams.get("challenger") ?? "A METALHEAD").toUpperCase();
  const genre = (searchParams.get("genre") ?? "metal").toUpperCase();
  const points = searchParams.get("points") ?? "100";
  const token = searchParams.get("token") ?? "";

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
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(204,0,0,0.35), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,215,0,0.15), transparent 50%)",
          borderTop: "4px solid #CC0000",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 800,
            color: "#CC0000",
            letterSpacing: 4,
          }}
        >
          ⚔️ BATTLE REQUEST
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginTop: 32,
            fontSize: 56,
            fontWeight: 800,
            color: "#F5F5F5",
          }}
        >
          <span>{challenger}</span>
          <span style={{ color: "#FFD700" }}>VS</span>
          <span>YOU</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 36,
            fontSize: 32,
            color: "#F5F5F5",
            border: "1px solid #2A2A2A",
            borderRadius: 999,
            padding: "12px 32px",
          }}
        >
          <span>{genre}</span>
          <span style={{ color: "#888888" }}>·</span>
          <span style={{ color: "#FFD700" }}>{points} TP AT STAKE</span>
        </div>

        <div style={{ display: "flex", fontSize: 30, color: "#888888", marginTop: 48 }}>
          Accept at blastriff.com/c/{token}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
