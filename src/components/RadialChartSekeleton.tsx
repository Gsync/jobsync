import React from "react";

export const RadialChartSekeleton = () => {
  return (
    <div className="relative cursor-default w-full h-full max-h-[180px] max-w-[180px] flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-6 h-6 border-4 border-t-4 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
      </div>
      <svg
        cx="50%"
        cy="50%"
        className="w-full h-full"
        width="180"
        height="180"
        viewBox="0 0 180 180"
      >
        <defs>
          <clipPath id="recharts4-clip">
            <rect x="5" y="5" height="170" width="170"></rect>
          </clipPath>
        </defs>
        <g className="recharts-layer recharts-polar-radius-axis radiusAxis">
          <text x="90" y="90" textAnchor="middle">
            <tspan
              x="90"
              y="74"
              className="fill-gray-300 text-2xl font-bold animate-pulse"
            >
              -
            </tspan>
            <tspan x="90" y="94" className="fill-gray-400 animate-pulse">
              Score
            </tspan>
          </text>
        </g>
        <g className="recharts-layer recharts-area stroke-transparent stroke-2">
          <g className="recharts-layer recharts-radial-bar-sectors">
            <g className="recharts-layer">
              <path
                cx="90"
                cy="90"
                fill="var(--color-improve)"
                className="fill-gray-300 animate-pulse"
                d="M 174.8528137423857,90
         A5,5,0,0,0,179.8441557272319,84.70588235294117
         A90,90,0,0,0,157.27291825334055,30.21409472392879
         A5,5,0,0,0,150,30
       L142.9150262212918,37.08497377870819
         A5,5,0,0,0,142.68718945207627,43.9124738389982
         A70,70,0,0,1,159.84427121978024,85.33333333333333
         A5,5,0,0,0,164.83314773547883,90Z"
                role="img"
              ></path>
            </g>
          </g>
        </g>
        <g className="recharts-layer recharts-area stroke-transparent stroke-2">
          <g className="recharts-layer recharts-radial-bar-sectors">
            <g className="recharts-layer">
              <path
                cx="90"
                cy="90"
                fill="var(--color-score)"
                className="fill-gray-400 animate-pulse"
                d="M 150,30
         A5,5,0,0,0,149.78590527607122,22.72708174665945
         A90,90,0,0,0,0.15584427276807844,84.7058823529412
         A5,5,0,0,0,5.147186257614294,89.99999999999999
       L15.166852264521168,89.99999999999999
         A5,5,0,0,0,20.15572878021976,85.33333333333331
         A70,70,0,0,1,136.0875261610018,37.31281054792375
         A5,5,0,0,0,142.9150262212918,37.08497377870819Z"
                role="img"
              ></path>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};
