import React from "react";
import { AttemptStatus } from "../types";

interface StatusBadgeProps {
  status: AttemptStatus;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const getBadgeDetails = () => {
    switch (status) {
      case "IN_PROGRESS":
        return {
          dotClass: "bg-zinc-400",
          textClass: "text-zinc-300",
          borderClass: "border-white/10 bg-white/[0.03]",
          label: "In Progress",
        };
      case "SUBMITTED":
        return {
          dotClass: "bg-amber-400",
          textClass: "text-amber-300",
          borderClass: "border-amber-500/20 bg-amber-500/[0.08]",
          label: "Submitted",
        };
      case "EVALUATING":
        return {
          dotClass: "bg-blue-400 animate-pulse",
          textClass: "text-blue-300",
          borderClass: "border-blue-500/20 bg-blue-500/[0.08]",
          label: "Evaluating...",
        };
      case "COMPLETED":
        return {
          dotClass: "bg-emerald-400",
          textClass: "text-emerald-300",
          borderClass: "border-emerald-500/20 bg-emerald-500/[0.08]",
          label: "Completed",
        };
      case "FAILED":
        return {
          dotClass: "bg-rose-400",
          textClass: "text-rose-300",
          borderClass: "border-rose-500/20 bg-rose-500/[0.08]",
          label: "Failed",
        };
    }
  };

  const details = getBadgeDetails();

  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-[11px] gap-1.5"
    : "px-2.5 py-1 text-xs gap-2";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono font-medium ${details.borderClass} ${details.textClass} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${details.dotClass}`} />
      <span>{details.label}</span>
    </span>
  );
};
