import React, { useState } from "react";
import { Rubric } from "../types";

interface RubricPanelProps {
  rubric: Rubric;
}

export const RubricPanel: React.FC<RubricPanelProps> = ({ rubric }) => {
  const [expandedKey, setExpandedKey] = useState<string | null>(rubric.criteria[0]?.key || null);

  return (
    <div className="border border-white/10 rounded-lg bg-[#0a0a0a] divide-y divide-white/10 text-sm">
      <div className="px-4 py-3 bg-white/[0.02] flex items-center justify-between text-xs font-mono text-zinc-400">
        <span className="font-semibold uppercase tracking-wider text-white">
          Evaluation Dimensions
        </span>
        <span className="text-zinc-500">
          Total: {rubric.totalMaxScore || 100} pts
        </span>
      </div>

      <div className="divide-y divide-white/10">
        {rubric.criteria.map((criterion) => {
          const isExpanded = expandedKey === criterion.key;
          return (
            <div key={criterion.key} className="transition-colors">
              <button
                type="button"
                onClick={() => setExpandedKey(isExpanded ? null : criterion.key)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">
                    {isExpanded ? "▾" : "▸"}
                  </span>
                  <span className="font-medium text-white text-sm">
                    {criterion.name}
                  </span>
                </div>
                <div className="font-mono text-xs text-zinc-400">
                  {criterion.maxScore} pts · {Math.round(criterion.weight * 100)}%
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3.5 pt-1 text-xs text-zinc-400 space-y-2 bg-white/[0.01] border-t border-white/5">
                  <p className="leading-relaxed">
                    {criterion.description}
                  </p>
                  <span className="inline-block font-mono text-[11px] text-zinc-500">
                    Key: {criterion.key}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
