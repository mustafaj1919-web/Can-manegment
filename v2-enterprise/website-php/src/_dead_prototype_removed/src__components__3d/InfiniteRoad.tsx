'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShowroomStore } from '@/store/useStore';

export default function InfiniteRoad() {
  const isDriving = useShowroomStore((state) => state.isDriving);
  const speed = useShowroomStore((state) => state.speed);
  const environment = useShowroomStore((state) => state.environment);

  const roadGroupRef = useRef<THREE.Group>(null);
  
  // Create static positions for road markers and glowing side pillars
  const items = useMemo(() => {
    const arr = [];
    // 16 street pillars on both left and right sides
    for (let i = 0; i < 8; i++) {
      const z = -i * 5; // spaced 5 units apart
      arr.push({ id: `left-${i}`, x: -1.8, z, isPillar: true });
      arr.push({ id: `right-${i}`, x: 1.8, z, isPillar: true });
      arr.push({ id: `stripe-${i}`, x: 0, z: z + 2.5, isPillar: false }); // center line stripes
    }
    return arr;
  }, []);

  // Animate road stripes and pillars in the render loop
  useFrame((state, delta) => {
    if (!isDriving || !roadGroupRef.current) return;

    // Convert speed (km/h) to translation units per second
    const translationSpeed = (speed / 3.6) * delta * 1.5;

    roadGroupRef.current.children.forEach((child) => {
      // Translate backward
      child.position.z += translationSpeed;

      // Wrap around when it goes behind the car/camera (e.g. > 5 units behind origin)
      if (child.position.z > 6) {
        child.position.z -= 40; // 8 pairs * 5 units = 40 total length
      }
    });
  });

  // Pillar lights color based on environment
  const glowColor = useMemo(() => {
    if (environment === 'desert') return '#f59e0b';
    if (environment === 'mountain') return '#06b6d4';
    if (environment === 'sea') return '#10b981';
    return '#3b82f6'; // city
  }, [environment]);

  if (!isDriving) return null;

  return (
    <group ref={roadGroupRef} position={[0, -0.6, 0]}>
      {/* Asphalt road mesh */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -15]} receiveShadow>
        <planeGeometry args={[4.5, 60]} />
        <meshStandardMaterial color="#0b0b0e" roughness={0.9} />
      </mesh>

      {/* Dynamic Road Objects */}
      {items.map((item) => {
        if (item.isPillar) {
          return (
            <group key={item.id} position={[item.x, 0.4, item.z]}>
              {/* Pillar Pole */}
              <mesh castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
                <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
              </mesh>
              {/* Glowing Neon Cap */}
              <mesh position={[0, 0.42, 0]}>
                <boxGeometry args={[0.08, 0.08, 0.08]} />
                <meshBasicMaterial color={glowColor} />
              </mesh>
              <pointLight position={[0, 0.3, 0]} color={glowColor} intensity={0.4} distance={3} />
            </group>
          );
        } else {
          // Center dashes
          return (
            <mesh key={item.id} rotation={[-Math.PI / 2, 0, 0]} position={[item.x, 0.005, item.z]}>
              <planeGeometry args={[0.08, 1.2]} />
              <meshBasicMaterial color="#ffffff" opacity={0.6} transparent />
            </mesh>
          );
        }
      })}
    </group>
  );
}
