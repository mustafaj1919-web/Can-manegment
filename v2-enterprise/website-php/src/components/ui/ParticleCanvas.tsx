"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; a: number; da: number;
}

interface Props {
  count?: number;
  color?: string;
  className?: string;
}

export function ParticleCanvas({ count = 70, color = "147,197,253", className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    const particles: Particle[] = [];

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawn = (): Particle => ({
      x: Math.random() * (W || 800),
      y: (H || 600) + 5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.4 + 0.1),
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.35 + 0.05,
      da: Math.random() * 0.0012 + 0.0005,
    });

    for (let i = 0; i < count; i++) {
      const p = spawn();
      p.y = Math.random() * (H || 600); // scatter on init
      particles.push(p);
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.a -= p.da;
        if (p.a <= 0 || p.y < -5) Object.assign(p, spawn());
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${p.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [count, color]);

  return <canvas ref={ref} className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
