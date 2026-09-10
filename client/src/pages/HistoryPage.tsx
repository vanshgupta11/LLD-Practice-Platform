import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Attempt } from "../types";
import { api } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getUserAttempts("candidate-alpha");
        const sorted = [...data].sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
        if (isMounted) setAttempts(sorted);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load attempt history.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTryAgain = async (problemId: string) => {
    try {
      setBusyId(problemId);
      const newAttempt = await api.startAttempt("candidate-alpha", problemId);
      navigate(`/practice/${newAttempt.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to start attempt.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRetryEvaluation = async (attemptId: string) => {
    try {
      setBusyId(attemptId);
      await api.retryEvaluation(attemptId);
      navigate(`/feedback/${attemptId}`);
    } catch (err: any) {
      alert(err.message || "Evaluation retry failed.");
      setBusyId(null);
    }
  };

  const handleDeleteAttempt = async (attemptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this attempt record? This cannot be undone.")) {
      return;
    }
    try {
      setBusyId(attemptId);
      await api.deleteAttempt(attemptId);
      setAttempts((prev) => prev.filter((a) => a.id !== attemptId));
    } catch (err: any) {
      alert(err.message || "Failed to delete attempt.");
    } finally {
      setBusyId(null);
    }
  };

  // Group attempts by problem to show improvement progression
  const attemptsByProblem: Record<string, Attempt[]> = {};
  attempts.forEach((att) => {
    const pId = att.problem?.id || "unknown";
    if (!attemptsByProblem[pId]) {
      attemptsByProblem[pId] = [];
    }
    attemptsByProblem[pId].push(att);
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-white/10 pb-5 animate-slide-up">
        <div className="space-y-1">
          <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-500">
            Timeline
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Attempt History
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Review past solution evaluations and score progression over time.
          </p>
        </div>

        <Link
          to="/problems"
          className="text-xs font-mono text-zinc-400 hover:text-white transition-colors group flex items-center gap-1"
        >
          <span>Explore problems</span>
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 font-mono">&rarr;</span>
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-24 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <span className="text-xs font-mono text-zinc-500 animate-pulse">
            Loading timeline...
          </span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-5 bg-white/[0.02] border border-white/10 rounded-lg text-center space-y-3 animate-scale-in">
          <p className="text-xs font-mono text-zinc-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-3.5 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-zinc-200 btn-interactive transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && attempts.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-lg bg-[#0a0a0a] space-y-3 animate-scale-in">
          <h3 className="text-sm font-semibold text-white">No Attempts Logged Yet</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Choose a problem from the catalog to practice your first low-level design solution.
          </p>
          <Link
            to="/problems"
            className="inline-block px-3.5 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-zinc-200 btn-interactive transition-colors"
          >
            Start practicing
          </Link>
        </div>
      )}

      {/* Grouped Problem Attempt Lists */}
      {!loading && !error && attempts.length > 0 && (
        <div className="space-y-6">
          {Object.entries(attemptsByProblem).map(([problemId, pAttempts], groupIdx) => {
            const problemTitle = pAttempts[0]?.problem?.title || problemId;
            const difficulty = pAttempts[0]?.problem?.difficulty;
            const delayClass = `delay-${Math.min(groupIdx + 1, 5)}`;
            
            // Score progression array sorted chronologically (oldest to newest)
            const scoresChronological = [...pAttempts]
              .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
              .filter((a) => a.status === "COMPLETED" && a.evaluation)
              .map((a) => a.evaluation?.overallScore);

            return (
              <div key={problemId} className={`border border-white/10 bg-[#0a0a0a] rounded-lg overflow-hidden card-hover animate-slide-up ${delayClass}`}>
                {/* Problem Group Header */}
                <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-semibold text-white">
                      {problemTitle}
                    </h2>
                    {difficulty && (
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">
                        · {difficulty}
                      </span>
                    )}
                  </div>

                  {/* Score progression trend indicator */}
                  {scoresChronological.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
                      <span>Progression:</span>
                      <span className="text-white font-medium font-mono">
                        {scoresChronological.join(" → ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Attempt Row Items */}
                <div className="divide-y divide-white/5">
                  {pAttempts.map((attempt, index) => {
                    const isCompleted = attempt.status === "COMPLETED";
                    const isFailed = attempt.status === "FAILED";
                    const isInProgress =
                      attempt.status === "IN_PROGRESS" ||
                      attempt.status === "SUBMITTED" ||
                      attempt.status === "EVALUATING";
                    const isBusy = busyId === attempt.id || busyId === attempt.problem?.id;
                    const dateFormatted = new Date(attempt.startedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const attemptNumber = pAttempts.length - index;

                    return (
                      <div
                        key={attempt.id}
                        className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-white/[0.02] transition-colors group/row"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-medium text-white w-20">
                            Attempt #{attemptNumber}
                          </span>

                          <span className="text-zinc-500 font-mono text-[11px]">
                            {dateFormatted}
                          </span>

                          <StatusBadge status={attempt.status} size="sm" />
                        </div>

                        {/* Right: Score + Action buttons */}
                        <div className="flex items-center gap-3 justify-between sm:justify-end">
                          {isCompleted && attempt.evaluation && (
                            <span className="font-mono font-bold text-sm text-white pr-2">
                              {attempt.evaluation.overallScore}
                              <span className="text-xs text-zinc-500 font-normal"> / 100</span>
                            </span>
                          )}

                          <div className="flex items-center gap-2">
                            {isCompleted && (
                              <button
                                onClick={() => navigate(`/feedback/${attempt.id}`)}
                                className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white border border-white/10 rounded-md bg-white/[0.03] hover:bg-white/[0.08] btn-interactive transition-all"
                              >
                                View feedback &rarr;
                              </button>
                            )}

                            {isFailed && (
                              <>
                                {attempt.submission && (
                                  <button
                                    onClick={() => handleRetryEvaluation(attempt.id)}
                                    disabled={isBusy}
                                    className="px-2.5 py-1 text-xs font-mono text-zinc-300 border border-white/10 rounded-md hover:bg-white/[0.05] btn-interactive transition-all disabled:opacity-50"
                                  >
                                    Retry eval
                                  </button>
                                )}
                                <button
                                  onClick={() => handleTryAgain(attempt.problem.id)}
                                  disabled={isBusy}
                                  className="px-2.5 py-1 text-xs font-medium text-zinc-300 border border-white/10 rounded-md hover:bg-white/[0.05] btn-interactive transition-all disabled:opacity-50"
                                >
                                  Try again
                                </button>
                              </>
                            )}

                            {isInProgress && (
                              <button
                                onClick={() => navigate(`/practice/${attempt.id}`)}
                                className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white border border-white/10 rounded-md bg-white/[0.03] hover:bg-white/[0.08] btn-interactive transition-all"
                              >
                                Resume practice &rarr;
                              </button>
                            )}

                            {/* Delete Option */}
                            <button
                              onClick={(e) => handleDeleteAttempt(attempt.id, e)}
                              disabled={isBusy}
                              title="Delete this attempt record"
                              className="px-2.5 py-1 text-xs font-mono text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-800/50 rounded-md btn-interactive transition-all disabled:opacity-40"
                            >
                              {busyId === attempt.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
