"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CircularScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm: { px: 40, stroke: 4, fontSize: 9, r: 15 },
  md: { px: 80, stroke: 6, fontSize: 16, r: 30 },
  lg: { px: 120, stroke: 8, fontSize: 24, r: 46 },
};

function getColor(score: number) {
  if (score >= 70) return "hsl(var(--chart-2))";
  if (score >= 40) return "hsl(var(--chart-4))";
  return "hsl(var(--destructive))";
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function CircularScore({ score, size = "md", animate = true, className }: CircularScoreProps) {
  const { px, stroke, fontSize, r } = SIZE_CONFIG[size];
  const cx = px / 2;
  const circumference = 2 * Math.PI * r;

  const [animated, setAnimated] = useState(animate ? 0 : score);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!animate) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          let startTime = 0;
          const duration = 900;

          const tick = (ts: number) => {
            if (!startTime) startTime = ts;
            const progress = Math.min((ts - startTime) / duration, 1);
            setAnimated(easeOutCubic(progress) * score);
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
          };

          rafRef.current = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [score, animate]);

  const dashOffset = circumference * (1 - Math.min(animated, 100) / 100);
  const color = getColor(score);

  return (
    <div ref={containerRef} className={cn("inline-flex items-center justify-center", className)}>
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        {/* Label */}
        <text
          x={cx}
          y={cx}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight="600"
          fill="currentColor"
          className="fill-foreground"
        >
          {Math.round(animated)}%
        </text>
      </svg>
    </div>
  );
}
