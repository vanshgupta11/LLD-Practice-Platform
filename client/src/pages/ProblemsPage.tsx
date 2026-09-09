import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Problem, DifficultyLevel } from "../types";
import { api } from "../services/api";

export const ProblemsPage: React.FC = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingProblemId, setStartingProblemId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProblems = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getProblems();
        if (isMounted) setProblems(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load practice problems.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProblems();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartPractice = async (problemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setStartingProblemId(problemId);
      const attempt = await api.startAttempt("candidate-alpha", problemId);
      navigate(`/practice/${attempt.id}`);
    } catch (err: any) {
      alert("Failed to start attempt. Please verify the backend is running.");
    } finally {
      setStartingProblemId(null);
    }
  };

  const getDifficultyBadge = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case "EASY":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "MEDIUM":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "HARD":
        return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Editorial Vercel-Style Hero Header */}
      <div className="space-y-3 max-w-3xl">
        <span className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-500">
          LLD Practice Platform
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
          Practice design. Understand your decisions. Improve.
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
          Structured low-level design problems with multi-dimensional evaluation across SOLID adherence, class responsibilities, and architectural trade-offs.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-24 text-center space-y-2">
          <div className="text-xs font-mono text-zinc-500 animate-pulse">
            Loading problem catalog...
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center space-y-3">
          <p className="text-xs font-mono text-rose-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-3.5 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-zinc-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && problems.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-lg bg-[#0a0a0a]">
          <h3 className="text-sm font-semibold text-white mb-1">No Problems Available</h3>
          <p className="text-xs text-zinc-400">Please ensure the backend database is seeded.</p>
        </div>
      )}

      {/* Problems Grid — Full Screen Responsive */}
      {!loading && !error && problems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {problems.map((problem) => (
            <div
              key={problem.id}
              onClick={() => navigate(`/problems/${problem.id}`)}
              className="group cursor-pointer bg-[#0a0a0a] border border-white/10 hover:border-white/20 rounded-lg p-6 transition-all duration-150 flex flex-col justify-between gap-6 hover:bg-[#0f0f0f]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white group-hover:text-white transition-colors">
                    {problem.title}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border shrink-0 ${getDifficultyBadge(
                      problem.difficulty
                    )}`}
                  >
                    {problem.difficulty}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed line-clamp-3">
                  {problem.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-zinc-500">
                  {problem.requirements?.length || 0} reqs · {problem.rubric?.criteria?.length || 5} criteria
                </span>

                <button
                  type="button"
                  onClick={(e) => handleStartPractice(problem.id, e)}
                  disabled={startingProblemId === problem.id}
                  className="inline-flex items-center gap-1.5 font-medium text-xs text-white group-hover:text-zinc-200 transition-colors disabled:opacity-50"
                >
                  <span>{startingProblemId === problem.id ? "Starting..." : "Start practice"}</span>
                  <span className="inline-block transition-transform duration-150 group-hover:translate-x-1 font-mono text-sm">
                    &rarr;
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
