"use client";

import { useEffect, useRef, useState } from "react";

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  };
}

function annularSector(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
) {
  const oStart = polarToCartesian(cx, cy, outerR, startAngle);
  const oEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const iStart = polarToCartesian(cx, cy, innerR, startAngle);
  const iEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const sweep = startAngle - endAngle;
  const largeArc = sweep > Math.PI ? 1 : 0;

  return [
    `M ${oStart.x} ${oStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${oEnd.x} ${oEnd.y}`,
    `L ${iEnd.x} ${iEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${iStart.x} ${iStart.y}`,
    "Z",
  ].join(" ");
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function RadialChartComponent({ score }: { score: number }) {
  const cx = 130;
  const cy = 130;
  const innerRadius = 80;
  const outerRadius = 130;
  const cornerRadius = 5;
  const duration = 1000;

  const [animatedScore, setAnimatedScore] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = 0;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      setAnimatedScore(eased * score);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score]);

  const fraction = Math.min(Math.max(animatedScore, 0), 100) / 100;
  const improveSweep = (1 - fraction) * Math.PI;
  const scoreStart = improveSweep;

  return (
    <div className="mx-auto w-full max-w-[180px] mb-[-20px]">
      <svg viewBox="-2 -2 264 190" className="w-full">
        {/* Improve (remaining) sector */}
        {animatedScore < 100 && (
          <path
            d={annularSector(
              cx,
              cy,
              innerRadius,
              outerRadius,
              improveSweep,
              0,
            )}
            fill="hsl(var(--chart-1))"
          />
        )}
        {/* Score sector */}
        {animatedScore > 0 && (
          <path
            d={annularSector(
              cx,
              cy,
              innerRadius,
              outerRadius,
              Math.PI,
              scoreStart,
            )}
            fill="hsl(var(--chart-2))"
          />
        )}
        {/* Rounded end caps */}
        {animatedScore > 0 && (
          <>
            <circle
              cx={cx - outerRadius + cornerRadius}
              cy={cy}
              r={cornerRadius}
              fill="hsl(var(--chart-2))"
            />
            <circle
              cx={cx - innerRadius - cornerRadius}
              cy={cy}
              r={cornerRadius}
              fill="hsl(var(--chart-2))"
            />
          </>
        )}
        {animatedScore < 100 && (
          <>
            <circle
              cx={cx + outerRadius - cornerRadius}
              cy={cy}
              r={cornerRadius}
              fill="hsl(var(--chart-1))"
            />
            <circle
              cx={cx + innerRadius + cornerRadius}
              cy={cy}
              r={cornerRadius}
              fill="hsl(var(--chart-1))"
            />
          </>
        )}
        {/* Center label */}
        <text x={cx} y={cy - 16} textAnchor="middle" dominantBaseline="middle">
          <tspan className="fill-foreground text-2xl font-bold">
            {Math.round(animatedScore).toLocaleString()}
          </tspan>
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle">
          <tspan className="fill-muted-foreground text-sm">Score</tspan>
        </text>
      </svg>
    </div>
  );
}
