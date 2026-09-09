import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Header: React.FC = () => {
  const location = useLocation();

  const navLinks = [
    { to: "/problems", label: "Problems" },
    { to: "/history", label: "History" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-13 py-2.5">
          {/* Left: Brand Monogram + Nav Tabs */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-6 h-6 rounded-md bg-white/[0.06] border border-white/15 flex items-center justify-center text-white text-xs font-mono font-medium group-hover:border-white/30 group-hover:bg-white/[0.1] transition-all">
                ⌘
              </div>
              <span className="font-medium text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>Cipher</span>
                <span className="text-zinc-400 font-mono text-xs font-normal">LLD</span>
              </span>
            </Link>

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1">
              {navLinks.map((item) => {
                const isActive =
                  item.to === "/problems"
                    ? location.pathname === "/" || location.pathname.startsWith("/problems")
                    : location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      isActive
                        ? "text-white bg-white/10 shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};
