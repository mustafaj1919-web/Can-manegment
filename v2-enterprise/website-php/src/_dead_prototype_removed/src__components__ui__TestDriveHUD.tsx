'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useShowroomStore } from '@/store/useStore';
import { Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import EngineSound from './EngineSound';

export default function TestDriveHUD() {
  const isDriving = useShowroomStore((state) => state.isDriving);
  const speed = useShowroomStore((state) => state.speed);
  const rpm = useShowroomStore((state) => state.rpm);
  const battery = useShowroomStore((state) => state.battery);
  const soundEnabled = useShowroomStore((state) => state.soundEnabled);
  const lang = useShowroomStore((state) => state.lang);
  
  const setDriving = useShowroomStore((state) => state.setDriving);
  const setSpeed = useShowroomStore((state) => state.setSpeed);
  const toggleSound = useShowroomStore((state) => state.toggleSound);

  const [gasActive, setGasActive] = useState(false);
  const [brakeActive, setBrakeActive] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDriving) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setGasActive(true);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setBrakeActive(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setGasActive(false);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setBrakeActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDriving]);

  // Frame loop for smooth acceleration and deceleration physics
  useEffect(() => {
    let lastTime = performance.now();

    const updatePhysics = (time: number) => {
      if (!isDriving) return;

      const dt = (time - lastTime) / 1000;
      lastTime = time;

      let nextSpeed = speed;

      if (gasActive) {
        // Accelerate up to 180 km/h (faster at lower speeds)
        const acceleration = 35 * (1 - speed / 220); 
        nextSpeed = Math.min(180, speed + acceleration * dt);
      } else if (brakeActive) {
        // Brake hard
        nextSpeed = Math.max(0, speed - 80 * dt);
      } else {
        // Natural friction/drag slow down
        nextSpeed = Math.max(0, speed - 12 * dt);
      }

      setSpeed(nextSpeed);
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    if (isDriving) {
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDriving, gasActive, brakeActive, speed, setSpeed]);

  if (!isDriving) return null;

  // SVG Gauge calculations
  const radius = 50;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // Speed Gauge stroke dashoffset
  const speedProgress = Math.min(1, speed / 180);
  const strokeDashoffset = circumference - speedProgress * circumference;

  // RPM Gauge stroke dashoffset
  const rpmProgress = Math.min(1, rpm / 6000);
  const rpmStrokeDashoffset = circumference - rpmProgress * circumference;

  return (
    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-30 p-6 font-sans">
      <EngineSound />

      {/* Top Bar - Action to Exit & Status */}
      <div className="flex justify-between items-center w-full">
        <button
          onClick={() => setDriving(false)}
          className="flex items-center gap-2 px-4 py-2 pointer-events-auto rounded-full glass-panel text-white hover:text-gold hover:border-gold transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{lang === 'ar' ? 'الخروج من التجربة' : 'Exit Test Drive'}</span>
        </button>

        {/* Battery Status Indicator */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-full glass-panel text-sm">
          <span className="text-gray-400">{lang === 'ar' ? 'البطارية:' : 'Battery:'}</span>
          <div className="w-20 bg-gray-800 h-2.5 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${battery}%` }}
            />
          </div>
          <span className="hud-value text-emerald-400 font-bold">{Math.round(battery)}%</span>
        </div>
      </div>

      {/* Center Prompt - Driving Instructions */}
      <div className="text-center self-center glass-panel px-6 py-3 rounded-xl max-w-sm">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
          {lang === 'ar' ? 'دليل التحكم بالقيادة' : 'Test Drive Mode'}
        </p>
        <p className="text-sm text-gray-200">
          {lang === 'ar' 
            ? 'اضغط W / ⬆ للتسارع، و S / ⬇ للفرملة. أو استخدم الأزرار بالأسفل.' 
            : 'Hold W / ⬆ to Accelerate, S / ⬇ to Brake. Or use HUD buttons below.'}
        </p>
      </div>

      {/* Bottom Bar - Gauges & Pedals */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-center w-full">
        
        {/* HUD GAUGES (Left on Desktop) */}
        <div className="flex gap-6 items-center pointer-events-auto bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/5">
          {/* Speed Dial */}
          <div className="relative flex flex-col items-center justify-center">
            <svg height={100} width={100}>
              <circle
                stroke="rgba(255,255,255,0.05)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke="var(--accent-gold)"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.1s ease' }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="hud-value text-xl font-bold text-white leading-none">{Math.round(speed)}</span>
              <span className="text-[10px] text-gray-500 font-semibold">{lang === 'ar' ? 'كم/س' : 'km/h'}</span>
            </div>
          </div>

          {/* RPM Dial */}
          <div className="relative flex flex-col items-center justify-center">
            <svg height={100} width={100}>
              <circle
                stroke="rgba(255,255,255,0.05)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke={rpm > 5000 ? '#ef4444' : 'var(--accent-blue)'}
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset: rpmStrokeDashoffset, transition: 'stroke-dashoffset 0.1s ease' }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="hud-value text-sm font-bold text-white leading-none">{(rpm / 1000).toFixed(1)}k</span>
              <span className="text-[10px] text-gray-500 font-semibold">RPM</span>
            </div>
          </div>

          {/* Sound & Sound Wave */}
          <button 
            onClick={toggleSound}
            className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/5 text-gray-300 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-500" />}
          </button>
        </div>

        {/* DRIVE PEDALS CONTROLLER (Right/Center - Pointer active) */}
        <div className="flex gap-4 items-center pointer-events-auto">
          {/* Brake Pedal */}
          <button
            onMouseDown={() => setBrakeActive(true)}
            onMouseUp={() => setBrakeActive(false)}
            onMouseLeave={() => setBrakeActive(false)}
            onTouchStart={() => setBrakeActive(true)}
            onTouchEnd={() => setBrakeActive(false)}
            className={`w-20 h-28 rounded-2xl flex flex-col justify-end p-4 border border-red-500/20 text-xs font-bold transition-all ${
              brakeActive ? 'bg-red-950/60 scale-95 border-red-500 text-red-400' : 'bg-black/60 text-gray-400 hover:bg-black/80'
            }`}
          >
            <div className="w-full bg-red-500/20 h-1.5 rounded-full overflow-hidden mb-4">
              <div className={`h-full bg-red-500 transition-all ${brakeActive ? 'w-full' : 'w-0'}`} />
            </div>
            <span>{lang === 'ar' ? 'كبح' : 'BRAKE'}</span>
          </button>

          {/* Gas Pedal */}
          <button
            onMouseDown={() => setGasActive(true)}
            onMouseUp={() => setGasActive(false)}
            onMouseLeave={() => setGasActive(false)}
            onTouchStart={() => setGasActive(true)}
            onTouchEnd={() => setGasActive(false)}
            className={`w-16 h-36 rounded-2xl flex flex-col justify-end p-4 border border-gold/20 text-xs font-bold transition-all ${
              gasActive ? 'bg-amber-950/60 scale-95 border-gold text-gold' : 'bg-black/60 text-gray-400 hover:bg-black/80'
            }`}
          >
            <div className="w-full bg-gold/20 h-1.5 rounded-full overflow-hidden mb-8">
              <div className={`h-full bg-gold transition-all ${gasActive ? 'w-full' : 'w-0'}`} />
            </div>
            <span>{lang === 'ar' ? 'وقود' : 'GAS'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
