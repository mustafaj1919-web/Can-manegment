'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Stars, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useShowroomStore } from '@/store/useStore';
import Vehicle3D from './Vehicle3D';
import InfiniteRoad from './InfiniteRoad';

// Dynamically interpolate camera position & orientation based on driving or scroll progress
const CameraController = () => {
  const isDriving = useShowroomStore((state) => state.isDriving);
  
  useFrame((state) => {
    if (isDriving) {
      // Smoothly move camera to chase position
      state.camera.position.lerp(new THREE.Vector3(0, 1.2, 5.8), 0.05);
      // Smoothly point the camera target to the front of the car
      const targetLookAt = new THREE.Vector3(0, 0.1, -2);
      state.camera.lookAt(targetLookAt);
    } else {
      // Calculate scroll progress (0.0 at top of page, 1.0 at bottom)
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 
        ? Math.min(1, Math.max(0, window.scrollY / scrollHeight)) 
        : 0;

      // Define default cinematic coordinates
      const targetPos = new THREE.Vector3(4, 2, 5); // default diagonal front
      const targetLook = new THREE.Vector3(0, 0, 0);

      // Lerp camera through a multi-stage flythrough path based on scroll progress
      if (scrollPercent < 0.25) {
        // Stage 1: Front diagonal -> Zoom in on Front Grill / Hood
        const t = scrollPercent / 0.25;
        targetPos.lerpVectors(new THREE.Vector3(4, 2, 5), new THREE.Vector3(0, 0.8, 2.8), t);
        targetLook.lerpVectors(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.1, 0.6), t);
      } else if (scrollPercent < 0.5) {
        // Stage 2: Front Grill -> Side panel profile
        const t = (scrollPercent - 0.25) / 0.25;
        targetPos.lerpVectors(new THREE.Vector3(0, 0.8, 2.8), new THREE.Vector3(2.8, 0.5, 0.2), t);
        targetLook.lerpVectors(new THREE.Vector3(0, 0.1, 0.6), new THREE.Vector3(0, 0.1, 0), t);
      } else if (scrollPercent < 0.75) {
        // Stage 3: Side profile -> Close up on Spoiler/Back
        const t = (scrollPercent - 0.5) / 0.25;
        targetPos.lerpVectors(new THREE.Vector3(2.8, 0.5, 0.2), new THREE.Vector3(-1.8, 1.2, -2.8), t);
        targetLook.lerpVectors(new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0, 0.25, -1.0), t);
      } else {
        // Stage 4: Back view -> High cinematic bird eye diagonal
        const t = (scrollPercent - 0.75) / 0.25;
        targetPos.lerpVectors(new THREE.Vector3(-1.8, 1.2, -2.8), new THREE.Vector3(-4.2, 2.2, -4.2), t);
        targetLook.lerpVectors(new THREE.Vector3(0, 0.25, -1.0), new THREE.Vector3(0, 0, 0), t);
      }

      // Smoothly interpolate the camera position
      state.camera.position.lerp(targetPos, 0.06);
      
      // Orient camera to target
      state.camera.lookAt(targetLook);
    }
  });
  
  return null;
};

// Environmental ambient properties helper
const ENV_SETTINGS = {
  city: {
    bgColor: '#06060c',
    ambientColor: '#2b305c',
    ambientIntensity: 0.6,
    spotLightColor: '#3b82f6',
    spotLightIntensity: 2.5,
    hasStars: true,
    starColor: '#3b82f6',
    hasGrid: true,
    gridColor: '#1e293b'
  },
  desert: {
    bgColor: '#1c120c',
    ambientColor: '#e08543',
    ambientIntensity: 0.5,
    spotLightColor: '#f59e0b',
    spotLightIntensity: 3.0,
    hasStars: true,
    starColor: '#f59e0b',
    hasGrid: false,
    gridColor: '#b45309'
  },
  mountain: {
    bgColor: '#091114',
    ambientColor: '#475569',
    ambientIntensity: 0.4,
    spotLightColor: '#06b6d4',
    spotLightIntensity: 2.0,
    hasStars: false,
    starColor: '#06b6d4',
    hasGrid: true,
    gridColor: '#334155'
  },
  sea: {
    bgColor: '#020b12',
    ambientColor: '#0f766e',
    ambientIntensity: 0.7,
    spotLightColor: '#10b981',
    spotLightIntensity: 2.8,
    hasStars: true,
    starColor: '#10b981',
    hasGrid: false,
    gridColor: '#14b8a6'
  }
};

export default function ShowroomCanvas() {
  const environment = useShowroomStore((state) => state.environment);
  const isDriving = useShowroomStore((state) => state.isDriving);
  const settings = ENV_SETTINGS[environment] || ENV_SETTINGS.city;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: settings.bgColor, transition: 'background-color 1s ease' }}>
      <Canvas
        shadows
        camera={{ position: [4, 2, 5], fov: 45 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      >
        <CameraController />
        <color attach="background" args={[settings.bgColor]} />
        
        {/* Dynamic Fog for atmospheric depth */}
        <fog attach="fog" args={[settings.bgColor, 6, 18]} />

        {/* Lighting setup based on environment */}
        <ambientLight 
          color={settings.ambientColor} 
          intensity={settings.ambientIntensity} 
        />
        
        <directionalLight
          castShadow
          position={[5, 10, 5]}
          intensity={1.5}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={30}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
        />
        
        <spotLight
          position={[-5, 8, -5]}
          angle={0.6}
          penumbra={0.8}
          intensity={settings.spotLightIntensity}
          color={settings.spotLightColor}
        />

        <Suspense fallback={null}>
          {/* Procedural Vehicle Model */}
          <Vehicle3D />
          
          {/* Infinite road in driving mode */}
          <InfiniteRoad />

          {/* Dynamic Ground Shadow */}
          <ContactShadows
            position={[0, -0.62, 0]}
            opacity={0.85}
            scale={10}
            blur={2.4}
            far={1.5}
          />
        </Suspense>

        {/* Environmental Ambient Objects */}
        {settings.hasStars && (
          <Stars 
            radius={80} 
            depth={50} 
            count={1200} 
            factor={4} 
            saturation={0.5} 
            fade 
            speed={1.5}
          />
        )}

        {/* Show a cool neon grid ground under the car in City & Mountain modes */}
        {settings.hasGrid && !isDriving && (
          <Grid
            position={[0, -0.63, 0]}
            args={[30, 30]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor={settings.gridColor}
            sectionSize={2.5}
            sectionThickness={1.0}
            sectionColor={settings.gridColor}
            fadeDistance={15}
          />
        )}

        {/* Camera interaction controls (Disabled during active test drive or when scrolled) */}
        {!isDriving && !isScrolled && (
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            maxPolarAngle={Math.PI / 2 - 0.05} // prevent going below ground
            minDistance={3}
            maxDistance={9}
          />
        )}
      </Canvas>
      
      {/* Dynamic ambient overlay to highlight reflecting depth */}
      <div className="absolute inset-0 pointer-events-none car-reflection-overlay" />
    </div>
  );
}
