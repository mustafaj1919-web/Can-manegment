'use client';

import { useEffect, useRef } from 'react';
import { useShowroomStore } from '@/store/useStore';

export default function EngineSound() {
  const isDriving = useShowroomStore((state) => state.isDriving);
  const rpm = useShowroomStore((state) => state.rpm);
  const speed = useShowroomStore((state) => state.speed);
  const soundEnabled = useShowroomStore((state) => state.soundEnabled);

  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Oscillators & Nodes
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // Noise generator for wind
  const windGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    // Start Web Audio Context when driving and sound is enabled
    if (isDriving && soundEnabled) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        // 1. Create Deep Engine Oscillator (Sawtooth)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(35 + (rpm / 6000) * 80, ctx.currentTime);
        osc1Ref.current = osc1;

        // 2. Create Sub-harmonic Oscillator (Square) for rumble
        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(17.5 + (rpm / 6000) * 40, ctx.currentTime);
        osc2Ref.current = osc2;

        // 3. Create Low Pass Filter to make it sound like a deep engine growl
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220 + (rpm / 6000) * 400, ctx.currentTime);
        filter.Q.setValueAtTime(4.0, ctx.currentTime);
        filterRef.current = filter;

        // 4. Main Gain node for volume control
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.5); // Fade in engine hum
        gainNodeRef.current = gainNode;

        // Connect nodes
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        // 5. White noise node for wind rush effect at speed
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const windFilter = ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.setValueAtTime(300, ctx.currentTime);
        windFilter.Q.setValueAtTime(2.0, ctx.currentTime);

        const windGain = ctx.createGain();
        windGain.gain.setValueAtTime(0.0, ctx.currentTime);
        windGainRef.current = windGain;

        whiteNoise.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(ctx.destination);

        // Start playing
        osc1.start();
        osc2.start();
        whiteNoise.start();
      } catch (e) {
        console.error('Failed to init Web Audio API:', e);
      }
    }

    // Cleanup audio context on stop
    return () => {
      if (audioCtxRef.current) {
        if (gainNodeRef.current) {
          try {
            // Fade out hum before closing
            gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, audioCtxRef.current.currentTime);
            gainNodeRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.1);
          } catch {}
        }
        setTimeout(() => {
          if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch(() => {});
          }
        }, 150);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriving, soundEnabled]);

  // Adjust pitch (frequency) and wind volume dynamically on speed and RPM changes
  useEffect(() => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
      const t = audioCtxRef.current.currentTime;
      
      // Update engine hum pitch
      if (osc1Ref.current) {
        osc1Ref.current.frequency.setTargetAtTime(35 + (rpm / 6000) * 110, t, 0.1);
      }
      if (osc2Ref.current) {
        osc2Ref.current.frequency.setTargetAtTime(17.5 + (rpm / 6000) * 55, t, 0.1);
      }
      
      // Open filter slightly at high RPMs for brighter engine roar
      if (filterRef.current) {
        filterRef.current.frequency.setTargetAtTime(220 + (rpm / 6000) * 600, t, 0.15);
      }

      // Wind volume increases with speed (simulating aerodynamic drag)
      if (windGainRef.current) {
        const windVolume = Math.min(0.05, (speed / 180) * 0.05);
        windGainRef.current.gain.setTargetAtTime(windVolume, t, 0.2);
      }
    }
  }, [rpm, speed]);

  return null; // Silent logic-only component
}
