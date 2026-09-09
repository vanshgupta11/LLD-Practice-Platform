import React from "react";
import { CriterionResult } from "../types";

interface CriteriaCardProps {
  result: CriterionResult;
}

export const CriteriaCard: React.FC<CriteriaCardProps> = ({ result }) => {
  const percentage = Math.round((result.score / result.maxScore) * 100);

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-400";
    if (pct >= 60) return "text-white";
    return "text-rose-400";
  };

  const formatConfidence = (conf?: number) => {
    if (conf === undefined) return null;
    if (conf >= 0.85) return "High";
    if (conf >= 0.65) return "Medium";
    return "Moderate";
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-5 space-y-4 hover:border-white/20 transition-all duration-150">
      {/* Header: Criterion Title + Fractional Score */}
      <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight">
            {result.criterionName}
          </h3>
          <span className="text-[11px] font-mono text-zinc-500">
            {result.criterionKey}
          </span>
        </div>

        <div className="text-right shrink-0">
          <span className={`text-base font-mono font-semibold ${getScoreColor(percentage)}`}>
            {result.score}
          </span>
          <span className="text-xs font-mono text-zinc-500">
            {" "}/ {result.maxScore}
          </span>
        </div>
      </div>

      {/* Structured Sections with subtle left markers */}
      <div className="space-y-3.5 text-sm">
        {/* Evidence */}
        {result.evidence && (
          <div className="pl-3 border-l-2 border-emerald-500/60 space-y-1">
            <span className="text-[11px] font-mono font-medium text-emerald-400 uppercase tracking-wider block">
              Evidence
            </span>
            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
              {result.evidence}
            </p>
          </div>
        )}

        {/* Concern */}
        {result.concern ? (
          <div className="pl-3 border-l-2 border-amber-500/60 space-y-1">
            <span className="text-[11px] font-mono font-medium text-amber-400 uppercase tracking-wider block">
              Concern
            </span>
            <p className="text-zinc-200 text-xs sm:text-sm leading-relaxed">
              {result.concern}
            </p>
          </div>
        ) : null}

        {/* Suggestion */}
        {result.suggestion && (
          <div className="pl-3 border-l-2 border-white/20 space-y-1">
            <span className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider block">
              Suggestion
            </span>
            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
              {result.suggestion}
            </p>
          </div>
        )}
      </div>

      {/* Confidence Footer */}
      {result.confidence !== undefined && (
        <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Confidence</span>
          <span className="text-zinc-300 font-medium">
            {formatConfidence(result.confidence)} ({Math.round(result.confidence * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
};
