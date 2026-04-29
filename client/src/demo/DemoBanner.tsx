import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useDemo, type DemoRole } from "./DemoContext";
import { RotateCcw, ArrowLeft, X } from "lucide-react";

const ROLE_LABELS: Record<DemoRole, string> = {
  manager: "Village Manager",
  collector: "Waste Collector",
  generator: "Household",
  fieldworker: "Field Worker",
};

export function DemoBanner() {
  const demo = useDemo();
  const [, setLocation] = useLocation();
  const [visible, setVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  // Hide on scroll down, show on scroll up (saves mobile screen space)
  // Uses ref to avoid re-subscribing the event listener on every scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollYRef.current && currentY > 60) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!demo) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-1.5">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          {/* Left: Back + Role label */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/demo")}
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 text-xs font-medium transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              <span className="hidden sm:inline">All Demos</span>
            </button>
            <div className="w-px h-4 bg-emerald-300" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-800">
                Demo Mode - {ROLE_LABELS[demo.role]}
              </span>
            </div>
          </div>

          {/* Right: Reset + Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={demo.resetDemo}
              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs font-medium px-2 py-0.5 rounded hover:bg-emerald-100 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={() => setLocation("/demo")}
              className="text-emerald-400 hover:text-emerald-700 p-0.5 rounded transition-colors"
              title="Exit demo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
