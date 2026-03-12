import { useEffect, useRef, useState } from "react";

interface StatsCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  duration?: number;
  dark?: boolean;
}

export function StatsCounter({ 
  value, 
  suffix = "", 
  prefix = "",
  label, 
  duration = 2000,
  dark = false 
}: StatsCounterProps) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let start = 0;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [hasStarted, value, duration]);

  return (
    <div ref={ref} className="text-center">
      <div className={`text-4xl md:text-5xl font-extrabold tracking-tight ${
        dark ? "text-white" : "text-slate-900"
      }`}>
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className={`text-sm md:text-base font-medium mt-2 ${
        dark ? "text-slate-400" : "text-slate-500"
      }`}>
        {label}
      </div>
    </div>
  );
}
