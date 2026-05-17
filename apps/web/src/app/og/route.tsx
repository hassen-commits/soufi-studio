import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

const COLORS = {
  navy: "#1a1a2e",
  gold: "#c9a96e",
  goldLight: "#c9a84c",
  parchment: "#f6f1e7",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") ?? "default";
  const title = searchParams.get("title") ?? "Soufi Studio";
  const subtitle = searchParams.get("subtitle") ?? undefined;
  const author = searchParams.get("author") ?? undefined;
  const work = searchParams.get("work") ?? undefined;
  const brand = "PASSION_CORAN · Soufi Studio";

  // Tailles adaptatives selon la longueur du titre
  const titleSize = title.length > 80 ? 48 : title.length > 50 ? 58 : 68;

  // Texture : étoiles statiques (positions déterministes via simple hash)
  const stars = Array.from({ length: 60 }).map((_, i) => {
    const x = ((i * 977) % 1200);
    const y = ((i * 613) % 630);
    const size = 1 + ((i * 7) % 4);
    const opacity = 0.3 + ((i * 13) % 5) / 10;
    return { x, y, size, opacity };
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: SIZE.width,
          height: SIZE.height,
          display: "flex",
          flexDirection: "column",
          background: `
            radial-gradient(ellipse 70% 60% at 50% 40%, rgba(70, 55, 110, 0.30) 0%, transparent 70%),
            linear-gradient(180deg, #08081e 0%, #1a1a2e 50%, #08081e 100%)
          `,
          color: COLORS.parchment,
          fontFamily: "serif",
          position: "relative",
          padding: "60px 80px",
        }}
      >
        {/* Étoiles cosmos */}
        {stars.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              backgroundColor: "white",
              opacity: s.opacity,
            }}
          />
        ))}

        {/* Glow doré central */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 35% 25% at 50% 50%, rgba(201, 169, 110, 0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Brand top */}
        <div
          style={{
            color: COLORS.gold,
            fontSize: 22,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            opacity: 0.7,
            display: "flex",
          }}
        >
          {brand}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* Title block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            margin: "0 auto",
            maxWidth: 1000,
          }}
        >
          {type === "citation" ? (
            <div
              style={{
                fontSize: 36,
                color: COLORS.gold,
                opacity: 0.4,
                marginBottom: 10,
                fontStyle: "italic",
                display: "flex",
              }}
            >
              «
            </div>
          ) : null}
          <div
            style={{
              fontSize: titleSize,
              fontStyle: "italic",
              color: COLORS.parchment,
              lineHeight: 1.15,
              display: "flex",
              textAlign: "center",
            }}
          >
            {title}
          </div>
          {type === "citation" ? (
            <div
              style={{
                fontSize: 36,
                color: COLORS.gold,
                opacity: 0.4,
                marginTop: 10,
                fontStyle: "italic",
                display: "flex",
              }}
            >
              »
            </div>
          ) : null}

          {subtitle ? (
            <>
              <div
                style={{
                  width: 200,
                  height: 1,
                  background: COLORS.gold,
                  opacity: 0.4,
                  margin: "30px 0 25px",
                  display: "flex",
                }}
              />
              <div
                style={{
                  fontSize: 28,
                  fontStyle: "italic",
                  color: COLORS.gold,
                  display: "flex",
                }}
              >
                {subtitle}
              </div>
            </>
          ) : null}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* Footer : author + work */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: COLORS.gold,
            fontSize: 24,
            fontStyle: "italic",
            opacity: 0.85,
          }}
        >
          <div style={{ display: "flex" }}>
            {author ? `— ${author}` : ""}
          </div>
          <div style={{ display: "flex", fontSize: 18, opacity: 0.7 }}>
            {work ?? "studio.iavance.fr"}
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
    },
  );
}
