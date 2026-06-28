"use client";

type StarryVariant = "midnight" | "indigo" | "teal" | "violet" | "amber" | "ocean";

const palettes: Record<StarryVariant, { sky: string; glow: string; star: string; swirl: string }> = {
  midnight: {
    sky: "from-[#0a0f1e] via-[#0d1528] to-[#060b18]",
    glow: "rgba(180,160,100,0.18)",
    star: "rgba(255,220,140,0.7)",
    swirl: "rgba(80,120,200,0.08)",
  },
  indigo: {
    sky: "from-[#0b0d1a] via-[#111833] to-[#080c1a]",
    glow: "rgba(140,160,220,0.16)",
    star: "rgba(200,210,255,0.65)",
    swirl: "rgba(100,130,210,0.09)",
  },
  teal: {
    sky: "from-[#060f14] via-[#0a1820] to-[#040c10]",
    glow: "rgba(100,200,180,0.14)",
    star: "rgba(180,240,220,0.6)",
    swirl: "rgba(80,170,160,0.08)",
  },
  violet: {
    sky: "from-[#0e0b18] via-[#151028] to-[#0a0814]",
    glow: "rgba(180,140,220,0.16)",
    star: "rgba(220,200,255,0.6)",
    swirl: "rgba(140,100,200,0.08)",
  },
  amber: {
    sky: "from-[#120e08] via-[#1a140c] to-[#0c0a06]",
    glow: "rgba(220,180,100,0.15)",
    star: "rgba(255,220,140,0.55)",
    swirl: "rgba(200,140,60,0.07)",
  },
  ocean: {
    sky: "from-[#060e18] via-[#0c1828] to-[#040a14]",
    glow: "rgba(100,180,220,0.15)",
    star: "rgba(180,220,255,0.6)",
    swirl: "rgba(80,150,200,0.08)",
  },
};

type StarryBackgroundProps = {
  variant?: StarryVariant;
  className?: string;
};

export function StarryBackground({ variant = "midnight", className = "" }: StarryBackgroundProps) {
  const p = palettes[variant];

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Deep sky gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${p.sky}`} />

      {/* Swirling nebula blobs — Starry Night brushstroke feel */}
      <div
        className="absolute -left-20 top-[10%] h-[500px] w-[500px] rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, ${p.swirl}, transparent 70%)` }}
      />
      <div
        className="absolute -right-32 top-[30%] h-[600px] w-[600px] rounded-full opacity-30 blur-3xl"
        style={{ background: `radial-gradient(circle, ${p.glow}, transparent 65%)` }}
      />
      <div
        className="absolute left-[40%] top-[60%] h-[400px] w-[400px] rounded-full opacity-25 blur-3xl"
        style={{ background: `radial-gradient(circle, ${p.swirl}, transparent 70%)` }}
      />

      {/* Swirl arcs — paint stroke simulation */}
      <div
        className="absolute left-[10%] top-[20%] h-[300px] w-[600px] opacity-20 blur-2xl"
        style={{
          background: `conic-gradient(from 200deg at 50% 50%, transparent, ${p.swirl}, transparent, ${p.glow}, transparent)`,
          borderRadius: "40% 60% 30% 70%",
          transform: "rotate(-15deg)",
        }}
      />
      <div
        className="absolute right-[5%] top-[50%] h-[350px] w-[500px] opacity-18 blur-2xl"
        style={{
          background: `conic-gradient(from 340deg at 50% 50%, transparent, ${p.glow}, transparent, ${p.swirl}, transparent)`,
          borderRadius: "50% 30% 60% 40%",
          transform: "rotate(25deg)",
        }}
      />

      {/* Star points — scattered bright dots */}
      {[
        { x: "8%", y: "12%", s: 3, o: 0.7 },
        { x: "15%", y: "28%", s: 2, o: 0.5 },
        { x: "22%", y: "8%", s: 4, o: 0.8 },
        { x: "35%", y: "18%", s: 2, o: 0.45 },
        { x: "48%", y: "6%", s: 3, o: 0.6 },
        { x: "55%", y: "22%", s: 2, o: 0.4 },
        { x: "62%", y: "10%", s: 4, o: 0.75 },
        { x: "70%", y: "25%", s: 2, o: 0.5 },
        { x: "78%", y: "8%", s: 3, o: 0.65 },
        { x: "85%", y: "18%", s: 2, o: 0.45 },
        { x: "92%", y: "12%", s: 3, o: 0.7 },
        { x: "12%", y: "45%", s: 2, o: 0.4 },
        { x: "28%", y: "55%", s: 3, o: 0.5 },
        { x: "42%", y: "40%", s: 2, o: 0.35 },
        { x: "58%", y: "48%", s: 3, o: 0.45 },
        { x: "75%", y: "42%", s: 2, o: 0.4 },
        { x: "88%", y: "52%", s: 3, o: 0.5 },
        { x: "5%", y: "65%", s: 2, o: 0.35 },
        { x: "20%", y: "72%", s: 2, o: 0.3 },
        { x: "50%", y: "68%", s: 3, o: 0.4 },
        { x: "68%", y: "75%", s: 2, o: 0.35 },
        { x: "82%", y: "65%", s: 2, o: 0.3 },
        { x: "95%", y: "70%", s: 3, o: 0.4 },
      ].map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: star.x,
            top: star.y,
            width: star.s,
            height: star.s,
            opacity: star.o,
            background: p.star,
            boxShadow: `0 0 ${star.s * 3}px ${star.s}px ${p.star}`,
          }}
        />
      ))}

      {/* Crescent moon glow */}
      <div
        className="absolute right-[12%] top-[6%] h-12 w-12 rounded-full opacity-70 blur-sm"
        style={{
          background: `radial-gradient(circle at 60% 40%, ${p.star}, rgba(255,240,200,0.3), transparent)`,
          boxShadow: `0 0 40px 8px ${p.glow}`,
        }}
      />

      {/* Bottom fade to black */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
