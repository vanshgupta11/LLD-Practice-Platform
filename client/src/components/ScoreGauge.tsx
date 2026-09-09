import React from "react";

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  maxScore = 100,
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((score / maxScore) * 100)));

  const getTier = (pct: number) => {
    if (pct >= 85) return { label: "Exemplary", text: "text-emerald-400" };
    if (pct >= 70) return { label: "Proficient", text: "text-white" };
    if (pct >= 50) return { label: "Needs Attention", text: "text-amber-400" };
    return { label: "Critical Gaps", text: "text-rose-400" };
  };

  const tier = getTier(percentage);

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold font-mono tracking-tight text-white">
          {score}
        </span>
        <span className="text-sm font-mono text-zinc-500">
          / {maxScore}
        </span>
      </div>
      <span className={`text-xs font-mono font-medium ${tier.text}`}>
        {tier.label}
      </span>
    </div>
  );
};
