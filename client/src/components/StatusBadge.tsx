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
          textClass: "text-zinc-400",
          borderClass: "border-white/10 bg-white/[0.02]",
          label: "In Progress",
        };
      case "SUBMITTED":
        return {
          dotClass: "bg-zinc-300",
          textClass: "text-zinc-300",
          borderClass: "border-white/10 bg-white/[0.03]",
          label: "Submitted",
        };
      case "EVALUATING":
        return {
          dotClass: "bg-white animate-pulse",
          textClass: "text-zinc-200",
          borderClass: "border-white/15 bg-white/[0.04]",
          label: "Evaluating...",
        };
      case "COMPLETED":
        return {
          dotClass: "bg-zinc-300",
          textClass: "text-zinc-200",
          borderClass: "border-white/10 bg-white/[0.03]",
          label: "Completed",
        };
      case "FAILED":
        return {
          dotClass: "bg-zinc-500",
          textClass: "text-zinc-400",
          borderClass: "border-white/10 bg-white/[0.02]",
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

