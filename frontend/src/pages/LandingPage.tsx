import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Code,
  Database,
  Play,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#261C14] flex flex-col relative overflow-x-hidden selection:bg-[#D05C2B]/20 selection:text-[#D05C2B]">
      {/* Ambient Warm Gradient Orbs (Alive background) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[360px] bg-[#D05C2B]/7 rounded-full blur-3xl pointer-events-none animate-ambient-glow" />
      <div
        className="absolute top-1/3 left-1/3 w-[380px] h-[300px] bg-amber-400/8 rounded-full blur-3xl pointer-events-none animate-ambient-glow"
        style={{ animationDelay: '4.5s' }}
      />

      {/* Technical Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(226, 219, 206, 0.45) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(226, 219, 206, 0.45) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Decorative Crosshair Marks (+) along grid lines with gentle breathing pulse */}
      <div className="absolute top-28 left-6 sm:left-12 text-[#D05C2B] font-mono text-sm select-none pointer-events-none animate-crosshair">
        +
      </div>
      <div
        className="absolute top-28 right-6 sm:right-12 text-[#D05C2B] font-mono text-sm select-none pointer-events-none animate-crosshair"
        style={{ animationDelay: '1s' }}
      >
        +
      </div>
      <div
        className="absolute bottom-16 left-6 sm:left-12 text-[#D05C2B] font-mono text-sm select-none pointer-events-none animate-crosshair"
        style={{ animationDelay: '2s' }}
      >
        +
      </div>
      <div
        className="absolute bottom-16 right-6 sm:right-12 text-[#D05C2B] font-mono text-sm select-none pointer-events-none animate-crosshair"
        style={{ animationDelay: '3s' }}
      >
        +
      </div>

      {/* 1. Top Announcement Bar */}
      <div className="relative z-10 w-full border-b border-[#EFE7DC] bg-[#FAF5EB]/90 py-2.5 px-4 text-center backdrop-blur-xs transition-opacity duration-500">
        <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#4E473C] font-sans">
          <span className="text-[#D05C2B] text-base leading-none select-none animate-star-twinkle">
            ✦
          </span>
          <span>
            Introducing TableTalk v1.0 — Ask questions on your data in plain English and get SQL, results, and insights instantly.
          </span>
        </div>
      </div>

      {/* 2. Top Navigation Bar */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-6 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/logo.png"
            alt="TableTalk Logo"
            className="h-10 md:h-12 w-auto object-contain select-none transition-transform duration-200 group-hover:scale-105"
          />
          <span className="font-serif font-bold text-2xl text-[#261C14] tracking-tight">
            TableTalk
          </span>
        </Link>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/app"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#261C14] hover:bg-[#150E0A] rounded-lg transition-all duration-200 flex items-center gap-1.5 shadow-xs hover:shadow-md hover:scale-[1.02]"
            >
              <span>Open App</span>
              <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-[#261C14] bg-white border border-[#DDD5C7] rounded-lg hover:bg-[#F7F2EA] transition-all duration-200 shadow-2xs hover:shadow-xs hover:scale-[1.01]"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold text-white bg-[#261C14] hover:bg-[#150E0A] rounded-lg transition-all duration-200 flex items-center gap-1.5 shadow-xs hover:shadow-md hover:scale-[1.02]"
              >
                <span>Get started</span>
                <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* 3. Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-4 pt-6 pb-8 sm:pt-8 sm:pb-12 max-w-4xl mx-auto w-full">
        {/* Main Headline */}
        <h1
          className={`relative font-serif font-bold text-[#261C14] text-5xl sm:text-6xl md:text-[72px] leading-[1.08] tracking-tight transition-all duration-700 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <span>
            Talk to your{' '}
            <span className="relative inline-block group/spark cursor-default">
              database
              {/* Radiating 3-dash burst directly at top-right of 'e' in 'database' matching user reference */}
              <span
                className="absolute -top-1.5 sm:-top-2.5 -right-6 sm:-right-8 select-none pointer-events-none animate-spark-pulse group-hover/spark:scale-115 transition-transform duration-300"
                aria-hidden="true"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 sm:w-7 sm:h-7"
                >
                  {/* Top dash: angle ~88deg upright */}
                  <line
                    x1="6"
                    y1="17"
                    x2="6"
                    y2="3"
                    stroke="#D05C2B"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                  />
                  {/* Middle dash: angle ~45deg diagonal */}
                  <line
                    x1="13"
                    y1="18"
                    x2="24"
                    y2="7"
                    stroke="#D05C2B"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                  />
                  {/* Lower dash: angle ~14deg shallow diagonal */}
                  <line
                    x1="17"
                    y1="25"
                    x2="30"
                    y2="22"
                    stroke="#D05C2B"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </span>
          </span>
          <br />
          <span className="font-serif italic font-normal text-[#D05C2B] block mt-1 sm:mt-1.5">
            in plain English
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className={`mt-5 text-base sm:text-lg text-[#5C5549] max-w-2xl mx-auto leading-relaxed font-sans transition-all duration-700 delay-100 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          A simple RAG-powered tool that understands your data,
          <br className="hidden sm:inline" />
          {' '}generates SQL, runs it, and gives you clear answers — no SQL required.
        </p>

        {/* Feature Flow Pills (The 3 badges with gentle floating animation and interactive hover lift) */}
        <div
          className={`mt-6 flex flex-wrap items-center justify-center gap-3 transition-all duration-700 delay-200 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="group px-4 py-2 bg-[#FAF5EC] hover:bg-[#FFFDF9] border border-[#E6DCCE] hover:border-[#D05C2B]/50 rounded-full text-xs sm:text-sm font-medium text-[#2B231D] flex items-center gap-2 shadow-2xs hover:shadow-[0_4px_16px_rgba(208,92,43,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-default animate-float-1">
            <Database size={15} className="text-[#D05C2B] transition-transform duration-300 group-hover:scale-120 group-hover:rotate-6" />
            <span>Connect a database</span>
          </div>

          <div className="group px-4 py-2 bg-[#FAF5EC] hover:bg-[#FFFDF9] border border-[#E6DCCE] hover:border-[#D05C2B]/50 rounded-full text-xs sm:text-sm font-medium text-[#2B231D] flex items-center gap-2 shadow-2xs hover:shadow-[0_4px_16px_rgba(208,92,43,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-default animate-float-2">
            <Code size={15} className="text-[#D05C2B] transition-transform duration-300 group-hover:scale-120 group-hover:-rotate-6" />
            <span>Generate SQL</span>
          </div>

          <div className="group px-4 py-2 bg-[#FAF5EC] hover:bg-[#FFFDF9] border border-[#E6DCCE] hover:border-[#D05C2B]/50 rounded-full text-xs sm:text-sm font-medium text-[#2B231D] flex items-center gap-2 shadow-2xs hover:shadow-[0_4px_16px_rgba(208,92,43,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-default animate-float-3">
            <BarChart3 size={15} className="text-[#D05C2B] transition-transform duration-300 group-hover:scale-120 group-hover:translate-y-[-1px]" />
            <span>Get results & insights</span>
          </div>
        </div>

        {/* Hero CTA Buttons */}
        <div
          className={`mt-6 flex flex-wrap items-center justify-center gap-4 transition-all duration-700 delay-300 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <Link
            to={user ? '/app' : '/register'}
            className="group relative overflow-hidden px-6 py-3.5 bg-[#261C14] hover:bg-[#150E0A] text-white text-sm sm:text-base font-semibold rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-[0_8px_24px_rgba(38,28,20,0.22)] hover:scale-[1.02] active:scale-[0.99]"
          >
            {/* Subtle continuous sheen sweep */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent animate-btn-shimmer pointer-events-none" />
            <span className="relative z-10">Get started for free</span>
            <ArrowRight size={16} className="relative z-10 transition-transform duration-200 group-hover:translate-x-1.5" />
          </Link>

          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="group px-6 py-3.5 bg-white hover:bg-[#FAF6F0] text-[#261C14] border border-[#DDD5C7] hover:border-[#D05C2B]/40 text-sm sm:text-base font-medium rounded-lg flex items-center gap-2.5 transition-all duration-200 shadow-2xs hover:shadow-xs hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute w-4 h-4 rounded-full bg-[#D05C2B]/30 animate-radar-ping pointer-events-none" />
              <Play size={13} className="fill-[#261C14] relative z-10 transition-transform duration-200 group-hover:scale-115" />
            </div>
            <span>See a live demo</span>
          </button>
        </div>

        {/* Bottom Tagline / Divider */}
        <div
          className={`mt-8 sm:mt-11 w-full flex items-center justify-center gap-4 max-w-xl mx-auto px-4 transition-all duration-700 delay-400 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="h-px bg-[#E4DDD2] flex-1" />
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.22em] text-[#7A7164] font-semibold whitespace-nowrap">
            Built for analysts, developers, and data teams
          </span>
          <div className="h-px bg-[#E4DDD2] flex-1" />
        </div>
      </main>

      {/* 4. Live Demo Modal */}
      {demoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF7F2] border border-[#DDD8CB] rounded-xl max-w-2xl w-full p-6 shadow-2xl relative text-left animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setDemoOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#6E6A60] hover:text-[#1F1E1B] rounded-md transition-colors"
              title="Close demo"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#DDD8CB]">
              <Sparkles size={16} className="text-[#D05C2B]" />
              <h3 className="font-serif font-bold text-lg text-[#1F1E1B]">TableTalk Interactive Demo</h3>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 bg-white border border-[#DDD8CB] rounded-lg">
                <span className="text-[10px] uppercase text-[#6E6A60] block mb-1">User Question:</span>
                <p className="font-sans font-semibold text-sm text-[#1F1E1B]">
                  "Show total revenue broken down by customer country, ordered highest to lowest."
                </p>
              </div>

              <div className="p-3 bg-[#1A1915] text-[#FAF9F6] border border-[#2B231D] rounded-lg overflow-x-auto">
                <span className="text-[10px] uppercase text-stone-400 block mb-1">Generated DuckDB SQL:</span>
                <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed">
{`SELECT 
  c.country, 
  SUM(o.gross_amount) AS total_revenue
FROM orders o
JOIN customers c ON o.customer_id = c.id
GROUP BY 1
ORDER BY 2 DESC;`}
                </pre>
              </div>

              <div className="border border-[#DDD8CB] rounded-lg overflow-hidden bg-white">
                <div className="px-3 py-1.5 bg-[#FAF9F6] border-b border-[#DDD8CB] text-[10px] text-[#6E6A60]">
                  Execution Result (DuckDB Sandbox · 24ms)
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F6] border-b border-[#DDD8CB]">
                    <tr>
                      <th className="p-2 font-semibold">country</th>
                      <th className="p-2 font-semibold text-right">total_revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE7DD]">
                    <tr>
                      <td className="p-2">United States</td>
                      <td className="p-2 text-right">$48,250.00</td>
                    </tr>
                    <tr>
                      <td className="p-2">Germany</td>
                      <td className="p-2 text-right">$27,120.50</td>
                    </tr>
                    <tr>
                      <td className="p-2">United Kingdom</td>
                      <td className="p-2 text-right">$19,840.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-[#6E6A60] font-sans flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Self-correction and Recharts visualization enabled
                </span>
                <Link
                  to={user ? '/app' : '/register'}
                  className="px-4 py-2 bg-[#261C14] hover:bg-[#150E0A] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <span>Launch Workbench</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
