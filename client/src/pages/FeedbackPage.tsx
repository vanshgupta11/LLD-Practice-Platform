import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Attempt, Evaluation, Submission } from "../types";
import { api } from "../services/api";
import { ScoreGauge } from "../components/ScoreGauge";
import { CriteriaCard } from "../components/CriteriaCard";
import { StatusBadge } from "../components/StatusBadge";

export const FeedbackPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [showSnapshot, setShowSnapshot] = useState(false);

  const loadFeedback = useCallback(async () => {
    if (!attemptId) return;
    try {
      setLoading(true);
      const [attemptData, evalData, subData] = await Promise.all([
        api.getAttempt(attemptId),
        api.getEvaluation(attemptId),
        api.getSubmission(attemptId),
      ]);
      setAttempt(attemptData);
      setEvaluation(evalData);
      setSubmission(subData);
    } catch (err: any) {
      console.error("Failed to load feedback:", err);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleTryAgain = async () => {
    if (!attempt) return;
    try {
      setRetrying(true);
      const newAttempt = await api.startAttempt("candidate-alpha", attempt.problem.id);
      navigate(`/practice/${newAttempt.id}`);
    } catch (err: any) {
      setRetryError(err.message || "Failed to start a new attempt.");
    } finally {
      setRetrying(false);
    }
  };

  const handleRetryEvaluation = async () => {
    if (!attemptId) return;
    setRetryError(null);
    try {
      setRetrying(true);
      const eval_ = await api.retryEvaluation(attemptId);
      setEvaluation(eval_);
      const refreshed = await api.getAttempt(attemptId);
      setAttempt(refreshed);
    } catch (err: any) {
      setRetryError(err.message || "Evaluation retry failed.");
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="text-xs font-mono text-zinc-500 animate-pulse">
          Loading evaluation report...
        </span>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 border border-white/10 bg-[#0a0a0a] rounded-lg text-center space-y-3">
        <h2 className="text-base font-semibold text-white">Attempt Not Found</h2>
        <p className="text-xs text-zinc-400">Could not find records for attempt ID: {attemptId}</p>
        <Link
          to="/problems"
          className="inline-block px-3.5 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-zinc-200 transition-colors"
        >
          Return to Problems
        </Link>
      </div>
    );
  }

  const problem = attempt.problem;
  const isFailed = attempt.status === "FAILED";

  // ─── FAILED Branch ────────────────────────────────────────────────────────
  if (isFailed && !evaluation) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 block">
              Evaluation Interrupted
            </span>
            <h1 className="text-xl font-bold text-white">{problem.title}</h1>
            <span className="text-xs font-mono text-zinc-500">Attempt: {attempt.id}</span>
          </div>
          <StatusBadge status={attempt.status} />
        </div>

        <div className="p-6 border border-rose-500/20 bg-rose-500/[0.05] rounded-lg space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-rose-400">Evaluation could not be completed</h2>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {attempt.errorMessage || "The evaluation request timed out or encountered an unexpected issue. Your submitted code is saved in our database."}
            </p>
          </div>

          {retryError && (
            <div className="p-3 bg-[#0a0a0a] border border-rose-500/30 rounded text-xs font-mono text-rose-300">
              {retryError}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            {submission && (
              <button
                onClick={handleRetryEvaluation}
                disabled={retrying}
                className="px-4 py-2 bg-white text-black text-xs font-medium rounded hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {retrying ? "Retrying evaluation..." : "Retry evaluation"}
              </button>
            )}
            <button
              onClick={handleTryAgain}
              disabled={retrying}
              className="px-4 py-2 bg-[#0a0a0a] text-white text-xs font-medium rounded border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Start new attempt
            </button>
          </div>
        </div>

        {submission && (
          <SubmissionSnapshot
            submission={submission}
            showSnapshot={showSnapshot}
            onToggle={() => setShowSnapshot(!showSnapshot)}
          />
        )}
      </div>
    );
  }

  // ─── Normal COMPLETED Evaluation ──────────────────────────────────────────
  if (!evaluation) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 border border-white/10 bg-[#0a0a0a] rounded-lg text-center space-y-3">
        <h2 className="text-base font-semibold text-white">Evaluation Pending</h2>
        <p className="text-xs text-zinc-400">Your submission is being processed.</p>
        <button
          onClick={loadFeedback}
          className="px-3.5 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-zinc-200 transition-colors"
        >
          Refresh status
        </button>
      </div>
    );
  }

  const completedDate = evaluation.completedAt
    ? new Date(evaluation.completedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  // Derive strong areas and areas needing attention
  const strongCriteria = evaluation.criteriaResults.filter(
    (c) => (c.score / c.maxScore) >= 0.75
  );
  const attentionCriteria = evaluation.criteriaResults.filter(
    (c) => (c.score / c.maxScore) < 0.75
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-medium">
              Evaluation Complete
            </span>
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-xs font-mono text-zinc-500">
              {completedDate}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {problem.title}
          </h1>
          <p className="text-xs font-mono text-zinc-500">
            attempt:{attempt.id.split("-").pop()} · {problem.difficulty}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTryAgain}
            disabled={retrying}
            className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>{retrying ? "Starting..." : "Try again"}</span>
            <span className="font-mono text-sm">&rarr;</span>
          </button>
        </div>
      </div>

      {/* Score Overview & Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pb-2">
        {/* Overall Score */}
        <div className="md:col-span-4 border border-white/10 bg-[#0a0a0a] rounded-lg p-5 space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
            Overall Score
          </span>
          <ScoreGauge score={evaluation.overallScore} />
          <div className="pt-3 border-t border-white/10 text-xs font-mono text-zinc-500">
            Evaluator: {evaluation.evaluatorType}
          </div>
        </div>

        {/* Executive Summary */}
        <div className="md:col-span-8 space-y-3">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 block">
            Architectural Synthesis
          </span>
          <p className="text-sm text-zinc-200 leading-relaxed bg-[#0a0a0a] border border-white/10 rounded-lg p-5">
            {evaluation.summary}
          </p>
        </div>
      </div>

      {/* Strong Areas & Needs Attention Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Strong Areas */}
        <div className="border border-white/10 bg-[#0a0a0a] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
              Strong Areas ({strongCriteria.length})
            </span>
          </div>
          {strongCriteria.length > 0 ? (
            <ul className="space-y-2 text-xs text-zinc-400">
              {strongCriteria.map((c) => (
                <li key={c.criterionKey} className="flex items-baseline justify-between gap-2 border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-zinc-200 font-medium">{c.criterionName}</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {c.score}/{c.maxScore}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500">No criteria scored &ge; 75%.</p>
          )}
        </div>

        {/* Needs Attention */}
        <div className="border border-white/10 bg-[#0a0a0a] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              Needs Attention ({attentionCriteria.length})
            </span>
          </div>
          {attentionCriteria.length > 0 ? (
            <ul className="space-y-2 text-xs text-zinc-400">
              {attentionCriteria.map((c) => (
                <li key={c.criterionKey} className="flex items-baseline justify-between gap-2 border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-zinc-200 font-medium">{c.criterionName}</span>
                  <span className="font-mono text-amber-400 font-medium">
                    {c.score}/{c.maxScore}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-emerald-400">All criteria scored above 75%.</p>
          )}
        </div>
      </div>

      {/* Criterion-by-Criterion Detailed Review */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-white">
            Criterion-by-Criterion Review
          </h2>
          <span className="text-xs font-mono text-zinc-500">
            {evaluation.criteriaResults.length} dimensions
          </span>
        </div>

        <div className="space-y-4">
          {evaluation.criteriaResults.map((res) => (
            <CriteriaCard key={res.criterionKey} result={res} />
          ))}
        </div>
      </div>

      {/* Submission Snapshot */}
      {submission && (
        <SubmissionSnapshot
          submission={submission}
          showSnapshot={showSnapshot}
          onToggle={() => setShowSnapshot(!showSnapshot)}
        />
      )}
    </div>
  );
};

// ─── Shared Submission Snapshot Component ──────────────────────────────────

interface SubmissionSnapshotProps {
  submission: Submission;
  showSnapshot: boolean;
  onToggle: () => void;
}

const SubmissionSnapshot: React.FC<SubmissionSnapshotProps> = ({
  submission,
  showSnapshot,
  onToggle,
}) => (
  <div className="border border-white/10 rounded-lg bg-[#0a0a0a] overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors text-xs font-mono text-zinc-400"
    >
      <span className="font-semibold text-white">
        {showSnapshot ? "▾ Hide Submitted Solution Snapshot" : "▸ View Submitted Solution Snapshot"}
      </span>
      <span className="text-zinc-500">
        Saved copy
      </span>
    </button>

    {showSnapshot && (
      <div className="p-5 border-t border-white/10 space-y-6 text-xs bg-black">
        {submission.assumptions && (
          <div className="space-y-1.5">
            <span className="font-mono font-semibold uppercase tracking-wider text-zinc-500 block">
              01 — Assumptions
            </span>
            <pre className="font-mono text-xs text-zinc-200 bg-[#0a0a0a] p-3.5 rounded border border-white/10 whitespace-pre-wrap leading-relaxed">
              {submission.assumptions}
            </pre>
          </div>
        )}

        {submission.classDesign && (
          <div className="space-y-1.5">
            <span className="font-mono font-semibold uppercase tracking-wider text-zinc-500 block">
              02 — Class Architecture
            </span>
            <pre className="font-mono text-xs text-zinc-200 bg-[#0a0a0a] p-3.5 rounded border border-white/10 whitespace-pre-wrap leading-relaxed">
              {submission.classDesign}
            </pre>
          </div>
        )}

        {submission.explanation && (
          <div className="space-y-1.5">
            <span className="font-mono font-semibold uppercase tracking-wider text-zinc-500 block">
              03 — Design Rationale
            </span>
            <pre className="text-xs text-zinc-200 bg-[#0a0a0a] p-3.5 rounded border border-white/10 whitespace-pre-wrap leading-relaxed font-sans">
              {submission.explanation}
            </pre>
          </div>
        )}

        {submission.code && (
          <div className="space-y-1.5">
            <span className="font-mono font-semibold uppercase tracking-wider text-zinc-500 block">
              04 — Implementation Code
            </span>
            <pre className="font-mono text-xs text-emerald-300 bg-[#0a0a0a] p-3.5 rounded border border-white/10 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {submission.code}
            </pre>
          </div>
        )}
      </div>
    )}
  </div>
);
