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

  const getEstimatedTime = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case "EASY":
        return "25–35 min";
      case "MEDIUM":
        return "40–50 min";
      case "HARD":
        return "60–75 min";
    }
  };

  const getDifficultyBadge = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case "EASY":
        return "bg-emerald-950/40 border-emerald-900/40 text-zinc-300";
      case "MEDIUM":
        return "bg-amber-950/40 border-amber-900/40 text-zinc-300";
      case "HARD":
        return "bg-rose-950/40 border-rose-900/40 text-zinc-300";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10 animate-fade-in">
      {/* Editorial Vercel-Style Header */}
      <div className="space-y-3 max-w-3xl animate-slide-up">
        <span className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-500">
          Catalog
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
          Practice Problems
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
          Multi-dimensional low-level design problems evaluated across SOLID principles, architectural boundaries, class responsibilities, and trade-offs.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-24 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <div className="text-xs font-mono text-zinc-500 animate-pulse">
            Loading problem catalog...
          </div>
        </div>
      )}

      {/* Error State */}
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
      {!loading && !error && problems.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-lg bg-[#0a0a0a] animate-scale-in">
          <h3 className="text-sm font-semibold text-white mb-1">No Problems Available</h3>
          <p className="text-xs text-zinc-400">Please ensure the backend database is seeded.</p>
        </div>
      )}

      {/* Problems List View with margin/spacing */}
      {!loading && !error && problems.length > 0 && (
        <div className="space-y-3">
          {/* Structured Column Header Bar */}
          <div className="hidden md:grid md:grid-cols-12 px-6 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-medium items-center animate-slide-up">
            <div className="col-span-6">Problem</div>
            <div className="col-span-2">Difficulty</div>
            <div className="col-span-2">Structure</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          {/* Spaced Problem List Items with Staggered Entrance */}
          <div className="space-y-2.5">
            {problems.map((problem, index) => {
              const delayClass = `delay-${Math.min(index + 1, 5)}`;
              return (
                <div
                  key={problem.id}
                  onClick={() => navigate(`/problems/${problem.id}`)}
                  className={`group cursor-pointer bg-[#0a0a0a] border border-white/10 card-hover rounded-lg p-5 sm:px-6 sm:py-4.5 flex flex-col md:grid md:grid-cols-12 md:items-center gap-4 animate-slide-up ${delayClass}`}
                >
                  {/* Problem Info (6 cols) */}
                  <div className="md:col-span-6 space-y-1.5 pr-0 md:pr-4">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs text-zinc-500 shrink-0">
                        {String(index + 1).padStart(2, "0")}.
                      </span>
                      <h2 className="text-base font-semibold text-white group-hover:text-zinc-100 transition-colors">
                        {problem.title}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed line-clamp-2 pl-6">
                      {problem.description}
                    </p>
                  </div>

                  {/* Difficulty (2 cols) */}
                  <div className="md:col-span-2 flex items-center pl-6 md:pl-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono border transition-colors ${getDifficultyBadge(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                  </div>

                  {/* Structure / Metadata (2 cols) */}
                  <div className="md:col-span-2 pl-6 md:pl-0 space-y-0.5 text-xs font-mono text-zinc-400">
                    <div>{problem.requirements?.length || 0} requirements</div>
                    <div className="text-[11px] text-zinc-500">
                      {problem.rubric?.criteria?.length || 5} criteria · {getEstimatedTime(problem.difficulty)}
                    </div>
                  </div>

                  {/* Action CTA (2 cols) */}
                  <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3 pl-6 md:pl-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                    <span className="text-xs font-mono text-zinc-500 md:hidden">
                      {getEstimatedTime(problem.difficulty)}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleStartPractice(problem.id, e)}
                      disabled={startingProblemId === problem.id}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 text-xs font-medium rounded btn-interactive transition-all disabled:opacity-50 shrink-0"
                    >
                      <span>{startingProblemId === problem.id ? "Starting..." : "Start practice"}</span>
                      <span className="font-mono text-sm inline-block transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

