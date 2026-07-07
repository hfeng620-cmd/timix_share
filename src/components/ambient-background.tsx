type AmbientVariant = "aurora" | "matrix" | "ember" | "glacier" | "void";

const configs: Record<AmbientVariant, { bg: string; accent: string; accent2: string }> = {
  aurora: {
    bg: "from-[#0a0f14] via-[#0d1018] to-[#080c10]",
    accent: "rgba(80,200,160,0.10)",
    accent2: "rgba(120,100,220,0.08)",
  },
  matrix: {
    bg: "from-[#080e0a] via-[#0a100c] to-[#060a08]",
    accent: "rgba(60,200,100,0.07)",
    accent2: "rgba(40,160,80,0.05)",
  },
  ember: {
    bg: "from-[#100c08] via-[#140e0a] to-[#0a0806]",
    accent: "rgba(220,140,60,0.08)",
    accent2: "rgba(180,100,40,0.05)",
  },
  glacier: {
    bg: "from-[#080c14] via-[#0a101a] to-[#060a10]",
    accent: "rgba(100,160,220,0.08)",
    accent2: "rgba(140,200,240,0.05)",
  },
  void: {
    bg: "from-[#08080a] via-[#0a0a0e] to-[#060608]",
    accent: "rgba(255,255,255,0.03)",
    accent2: "rgba(255,255,255,0.02)",
  },
};

type AmbientBackgroundProps = { variant?: AmbientVariant; className?: string };

export function AmbientBackground({ variant = "void", className = "" }: AmbientBackgroundProps) {
  const c = configs[variant];

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-b ${c.bg}`} />
      <div className="absolute -left-32 top-[5%] h-96 w-96 rounded-full blur-3xl opacity-40"
        style={{ background: `radial-gradient(circle, ${c.accent}, transparent 70%)` }} />
      <div className="absolute -right-24 top-[40%] h-80 w-80 rounded-full blur-3xl opacity-30"
        style={{ background: `radial-gradient(circle, ${c.accent2}, transparent 65%)` }} />
      <div className="absolute left-[50%] top-[70%] h-64 w-64 rounded-full blur-3xl opacity-25"
        style={{ background: `radial-gradient(circle, ${c.accent}, transparent 70%)` }} />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090b] to-transparent" />
    </div>
  );
}
