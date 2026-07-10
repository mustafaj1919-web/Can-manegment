"use client";

import { cn } from "@/lib/utils";
import type { VehicleCategory } from "@/lib/types";

interface VehicleStudioRenderProps {
  category: VehicleCategory;
  accent?: string;
  className?: string;
  angle?: "side" | "three-quarter";
}

/**
 * Vector studio render of a vehicle silhouette. Used in place of photography
 * across the catalog so every model presents a consistent, premium, on-brand
 * visual — a look shared by several EV configurators before full photo
 * libraries are shot.
 */
export default function VehicleStudioRender({
  category,
  accent = "#2563eb",
  className,
  angle = "side",
}: VehicleStudioRenderProps) {
  const bodyPath = BODY_PATHS[category];
  const skew = angle === "three-quarter" ? -6 : 0;

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 100% at 50% 20%, ${accent}22 0%, transparent 60%)`,
        }}
      />
      <svg
        viewBox="0 0 640 280"
        className="relative w-[92%]"
        style={{ transform: `perspective(900px) rotateY(${skew}deg)` }}
      >
        <defs>
          <linearGradient id={`body-${category}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`glass-${category}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.35" />
          </linearGradient>
          <radialGradient id={`shadow-${category}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="320" cy="238" rx="230" ry="18" fill={`url(#shadow-${category})`} />

        <path d={bodyPath.body} fill={`url(#body-${category})`} stroke={accent} strokeOpacity="0.4" strokeWidth="1.5" />
        <path d={bodyPath.glass} fill={`url(#glass-${category})`} />
        <circle cx={bodyPath.wheelFront} cy="205" r="30" fill="#0a0e18" />
        <circle cx={bodyPath.wheelFront} cy="205" r="14" fill="#3a4353" />
        <circle cx={bodyPath.wheelRear} cy="205" r="30" fill="#0a0e18" />
        <circle cx={bodyPath.wheelRear} cy="205" r="14" fill="#3a4353" />
        <rect x={bodyPath.wheelRear - 24} y="196" width="48" height="6" rx="3" fill={accent} opacity="0.9" />
        <rect x={bodyPath.wheelFront - 24} y="196" width="48" height="6" rx="3" fill={accent} opacity="0.9" />
      </svg>
    </div>
  );
}

const BODY_PATHS: Record<
  VehicleCategory,
  { body: string; glass: string; wheelFront: number; wheelRear: number }
> = {
  sedan: {
    body: "M40 200 C40 170 70 168 110 160 C150 130 200 108 280 104 C360 100 420 106 470 128 C520 138 570 150 596 168 C606 176 604 196 596 200 L500 202 C494 178 468 162 442 162 C416 162 392 178 386 202 L250 202 C244 178 218 162 192 162 C166 162 142 178 136 202 L40 200 Z",
    glass: "M170 158 C205 128 245 114 290 112 C335 110 385 116 430 132 C450 140 462 150 468 158 C400 150 240 150 170 158 Z",
    wheelFront: 468,
    wheelRear: 214,
  },
  suv: {
    body: "M34 202 C34 164 64 160 100 150 C130 116 172 96 240 92 C330 86 410 92 468 116 C516 128 578 146 604 170 C614 178 610 200 600 202 L508 202 C502 176 476 160 450 160 C424 160 400 176 394 202 L258 202 C252 176 226 160 200 160 C174 160 150 176 144 202 L34 202 Z",
    glass: "M150 148 C186 112 226 96 272 92 C330 88 400 96 448 118 C462 126 472 136 478 146 C390 136 230 138 150 148 Z",
    wheelFront: 478,
    wheelRear: 218,
  },
  hatchback: {
    body: "M56 202 C56 176 80 172 112 164 C140 134 176 116 226 112 C288 108 344 116 386 138 C430 150 486 162 512 176 C520 182 518 198 510 202 L440 202 C434 180 410 166 386 166 C362 166 340 180 334 202 L226 202 C220 180 196 166 172 166 C148 166 126 180 120 202 L56 202 Z",
    glass: "M158 158 C190 128 222 116 258 112 C304 108 350 116 384 136 C396 142 404 150 410 158 C340 150 220 150 158 158 Z",
    wheelFront: 410,
    wheelRear: 176,
  },
  performance: {
    body: "M30 204 C30 178 58 172 96 162 C138 118 190 100 264 98 C348 96 424 108 480 134 C524 146 582 158 606 174 C614 180 610 198 602 202 L512 202 C506 176 480 160 454 160 C428 160 404 176 398 202 L246 202 C240 176 214 160 188 160 C162 160 138 176 132 202 L30 204 Z",
    glass: "M164 154 C204 116 250 100 296 98 C356 96 420 106 464 128 C478 136 488 146 494 154 C400 144 240 144 164 154 Z",
    wheelFront: 480,
    wheelRear: 212,
  },
};
