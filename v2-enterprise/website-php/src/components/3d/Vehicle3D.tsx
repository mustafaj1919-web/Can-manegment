'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShowroomStore } from '@/store/useStore';

// Custom Metallic Flake Shader with Fresnel reflection and cursor-light sweep
const MetallicShaderMaterial = {
  uniforms: {
    uColor: { value: new THREE.Color('#d4af37') },
    uMetalness: { value: 0.85 },
    uRoughness: { value: 0.15 },
    uCursorPos: { value: new THREE.Vector2(0, 0) },
    uTime: { value: 0 },
    uLightSweepSpeed: { value: 1.0 },
    uFresnelBias: { value: 0.1 },
    uFresnelScale: { value: 1.2 },
    uFresnelPower: { value: 2.5 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      vNormal = normalize(normalMatrix * normal);
      vViewPosition = -mvPosition.xyz;
      
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uMetalness;
    uniform float uRoughness;
    uniform vec2 uCursorPos;
    uniform float uTime;
    uniform float uFresnelBias;
    uniform float uFresnelScale;
    uniform float uFresnelPower;
    
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    
    // Procedural pseudo-noise for metallic flake sparkle
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + vec3(0.1, 0.1, 0.1));
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      
      // Fresnel effect for glossy edge sheen (rim light)
      float fresnel = uFresnelBias + uFresnelScale * pow(1.0 - max(dot(normal, viewDir), 0.0), uFresnelPower);
      
      // Reflective mapping based on view-space normals
      vec3 reflectDir = reflect(-viewDir, normal);
      float envReflection = smoothstep(0.1, 0.9, reflectDir.y * 0.5 + 0.5);
      
      // Fixed lights in view space to ensure bright metallic lighting in all orientations
      vec3 lightDir1 = normalize(vec3(0.5, 0.8, 0.6));
      vec3 lightDir2 = normalize(vec3(-0.7, 0.4, -0.4));
      float diffuse1 = max(dot(normal, lightDir1), 0.0);
      float diffuse2 = max(dot(normal, lightDir2), 0.0);
      float diffuse = diffuse1 * 0.8 + diffuse2 * 0.2;
      
      // Cursor sweep light (screen space cursor converted to light direction)
      vec3 cursorLightDir = normalize(vec3(uCursorPos.x * 2.0, uCursorPos.y * 2.0, 1.2));
      float cursorDiffuse = max(dot(normal, cursorLightDir), 0.0);
      
      // Metallic flakes sparkle
      float sparkle = hash(vWorldPosition * 220.0);
      float flakeEffect = 0.0;
      if (sparkle > 0.97) {
        flakeEffect = pow(max(dot(normal, cursorLightDir), 0.0), 16.0) * 0.35 * uMetalness;
      }
      
      // Light sweep wave (animating neon band)
      float sweep = sin(vWorldPosition.z * 1.5 - uTime * 2.0) * 0.5 + 0.5;
      float sweepIndicator = smoothstep(0.95, 1.0, sweep) * 0.18;
      
      // Final paint compose: Base paint + Reflection + Diffuse Sweep + Edge Fresnel + Sparkle + Cursor Highlight
      vec3 basePaint = mix(uColor, vec3(0.04), uRoughness);
      vec3 reflectionColor = vec3(1.0, 0.96, 0.9) * envReflection * uMetalness * 0.5;
      vec3 fresnelSheen = vec3(1.0) * fresnel * (1.0 - uRoughness) * 0.5;
      vec3 sweepLight = vec3(1.0, 0.9, 0.7) * sweepIndicator;
      vec3 cursorHighlight = vec3(1.0, 0.95, 0.85) * cursorDiffuse * uMetalness * 0.3;
      
      vec3 finalColor = basePaint * (0.3 + diffuse * 0.7) + reflectionColor + fresnelSheen + flakeEffect + sweepLight + cursorHighlight;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

export default function Vehicle3D() {
  const selectedColor = useShowroomStore((state) => state.selectedColor);
  const selectedWheels = useShowroomStore((state) => state.selectedWheels);
  const lightsOn = useShowroomStore((state) => state.lightsOn);
  const doorsOpen = useShowroomStore((state) => state.doorsOpen);
  const hoodOpen = useShowroomStore((state) => state.hoodOpen);
  const isDriving = useShowroomStore((state) => state.isDriving);
  const speed = useShowroomStore((state) => state.speed);
  
  // Refs for animated components
  const bodyMatRef = useRef<THREE.ShaderMaterial>(null);
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const hoodRef = useRef<THREE.Group>(null);
  const wheelFLRef = useRef<THREE.Mesh>(null);
  const wheelFRRef = useRef<THREE.Mesh>(null);
  const wheelRLRef = useRef<THREE.Mesh>(null);
  const wheelRRRef = useRef<THREE.Mesh>(null);
  const pointerPos = useRef(new THREE.Vector2(0, 0));

  // Sync cursor movements and animations in frame loop
  useFrame((state) => {
    // 1. Sync time and cursor uniform
    if (bodyMatRef.current) {
      bodyMatRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      
      // Lerp mouse pointer
      pointerPos.current.lerp(state.pointer, 0.1);
      bodyMatRef.current.uniforms.uCursorPos.value.copy(pointerPos.current);
      
      // Update color dynamically from store
      bodyMatRef.current.uniforms.uColor.value.set(selectedColor.hex);
      bodyMatRef.current.uniforms.uMetalness.value = selectedColor.metalness;
      bodyMatRef.current.uniforms.uRoughness.value = selectedColor.roughness;
    }

    // 2. Door animations (lerp rotation)
    const targetDoorRot = doorsOpen ? Math.PI / 4.5 : 0;
    if (leftDoorRef.current) {
      leftDoorRef.current.rotation.y = THREE.MathUtils.lerp(leftDoorRef.current.rotation.y, targetDoorRot, 0.08);
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.rotation.y = THREE.MathUtils.lerp(rightDoorRef.current.rotation.y, -targetDoorRot, 0.08);
    }

    // 3. Hood animation (lerp rotation)
    const targetHoodRot = hoodOpen ? -Math.PI / 6 : 0;
    if (hoodRef.current) {
      hoodRef.current.rotation.x = THREE.MathUtils.lerp(hoodRef.current.rotation.x, targetHoodRot, 0.08);
    }

    // 4. Wheels spinning (based on driving speed)
    if (isDriving) {
      const rotationSpeed = (speed / 180) * 0.8;
      if (wheelFLRef.current) wheelFLRef.current.rotation.x -= rotationSpeed;
      if (wheelFRRef.current) wheelFRRef.current.rotation.x -= rotationSpeed;
      if (wheelRLRef.current) wheelRLRef.current.rotation.x -= rotationSpeed;
      if (wheelRRRef.current) wheelRRRef.current.rotation.x -= rotationSpeed;
      
      // Add subtle vibrating effect to body when driving
      // state.camera.position.y += Math.sin(state.clock.getElapsedTime() * 50) * 0.0005;
    }
  });

  // Custom Shader Material initialization
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MetallicShaderMaterial.uniforms),
      vertexShader: MetallicShaderMaterial.vertexShader,
      fragmentShader: MetallicShaderMaterial.fragmentShader
    });
  }, []);

  // Standard wheel geometry
  const WheelMesh = ({ meshRef }: { meshRef: React.RefObject<THREE.Mesh | null> }) => (
    <mesh ref={meshRef} castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[selectedWheels.radius, selectedWheels.radius, 0.35, 32]} />
      <meshStandardMaterial 
        color="#111" 
        roughness={0.6} 
        metalness={0.2}
      />
      {/* Rims/Spokes details */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[selectedWheels.radius * 0.8, selectedWheels.radius * 0.8, 0.36, 12, 1, true]} />
        <meshStandardMaterial 
          color="#d1d5db" 
          roughness={0.2} 
          metalness={0.9}
        />
      </mesh>
      {/* Dynamic Wheel Center cap */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[selectedWheels.radius * 0.2, selectedWheels.radius * 0.2, 0.37, 8]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
      </mesh>
    </mesh>
  );

  return (
    <group position={[0, -0.4, 0]}>
      {/* 1. CHASSIS / MAIN BODY */}
      <mesh castShadow receiveShadow material={shaderMaterial}>
        <boxGeometry args={[1.7, 0.45, 4.0]} />
      </mesh>
      
      {/* Aerodynamic Cabin roof */}
      <mesh castShadow receiveShadow position={[0, 0.45, -0.2]}>
        <boxGeometry args={[1.5, 0.5, 2.2]} />
        <meshStandardMaterial color="#0f0f15" roughness={0.1} metalness={0.9} />
      </mesh>

      {/* Glossy Windshield & Windows */}
      <mesh castShadow position={[0, 0.47, 0.9]} rotation={[-Math.PI / 6, 0, 0]}>
        <planeGeometry args={[1.45, 0.7]} />
        <meshStandardMaterial color="#1a202c" transparent opacity={0.65} roughness={0.0} metalness={1.0} />
      </mesh>
      
      {/* Back Glass */}
      <mesh castShadow position={[0, 0.47, -1.3]} rotation={[Math.PI / 6, 0, 0]}>
        <planeGeometry args={[1.45, 0.7]} />
        <meshStandardMaterial color="#1a202c" transparent opacity={0.65} roughness={0.0} metalness={1.0} />
      </mesh>

      {/* 2. GLOWING HEADLIGHTS (FRONT) */}
      <group position={[0, 0, 2.01]}>
        {/* Left Headlight */}
        <mesh position={[-0.65, 0.05, 0]}>
          <planeGeometry args={[0.25, 0.08]} />
          <meshBasicMaterial color={lightsOn ? '#ffffff' : '#444'} />
        </mesh>
        {/* Right Headlight */}
        <mesh position={[0.65, 0.05, 0]}>
          <planeGeometry args={[0.25, 0.08]} />
          <meshBasicMaterial color={lightsOn ? '#ffffff' : '#444'} />
        </mesh>
        {/* Actual Lights sources projecting forward */}
        {lightsOn && (
          <>
            <spotLight 
              position={[-0.65, 0.05, 0.1]} 
              angle={Math.PI / 5} 
              penumbra={0.5} 
              intensity={4} 
              distance={25} 
              castShadow 
            />
            <spotLight 
              position={[0.65, 0.05, 0.1]} 
              angle={Math.PI / 5} 
              penumbra={0.5} 
              intensity={4} 
              distance={25} 
              castShadow 
            />
          </>
        )}
      </group>

      {/* 3. GLOWING TAILLIGHTS (BACK - NEON STRIP) */}
      <group position={[0, 0.05, -2.01]}>
        <mesh>
          <planeGeometry args={[1.4, 0.06]} />
          <meshBasicMaterial color={lightsOn ? '#ff0033' : '#550000'} />
        </mesh>
        {lightsOn && (
          <pointLight position={[0, 0, -0.2]} intensity={2.5} distance={5} color="#ff0000" />
        )}
      </group>

      {/* 4. HOOD (FRONT LID - ANIMATED) */}
      <group ref={hoodRef} position={[0, 0.23, 1.0]}>
        {/* Shift model offset to the rotation hinge (which is at the back of the hood) */}
        <mesh position={[0, 0.02, 0.5]} castShadow material={shaderMaterial}>
          <boxGeometry args={[1.66, 0.04, 1.2]} />
        </mesh>
      </group>

      {/* 5. DOORS (ANIMATED SIDE WINGS - SCISSOR/GULLWING DOORS) */}
      {/* Left Gullwing Door */}
      <group ref={leftDoorRef} position={[-0.85, 0.4, 0]}>
        <mesh position={[0, 0, 0.1]} castShadow material={shaderMaterial}>
          <boxGeometry args={[0.04, 0.45, 1.3]} />
        </mesh>
        {/* Simple Side mirror */}
        <mesh position={[-0.1, 0.15, 0.5]} castShadow>
          <boxGeometry args={[0.15, 0.08, 0.2]} />
          <meshStandardMaterial color="#111" metalness={0.8} roughness={0.1} />
        </mesh>
      </group>

      {/* Right Gullwing Door */}
      <group ref={rightDoorRef} position={[0.85, 0.4, 0]}>
        <mesh position={[0, 0, 0.1]} castShadow material={shaderMaterial}>
          <boxGeometry args={[0.04, 0.45, 1.3]} />
        </mesh>
        {/* Simple Side mirror */}
        <mesh position={[0.1, 0.15, 0.5]} castShadow>
          <boxGeometry args={[0.15, 0.08, 0.2]} />
          <meshStandardMaterial color="#111" metalness={0.8} roughness={0.1} />
        </mesh>
      </group>

      {/* 6. WHEELS WITH SUSPENSION HINGES */}
      <group position={[-0.88, -0.22, 1.25]}>
        <WheelMesh meshRef={wheelFLRef} />
      </group>
      <group position={[0.88, -0.22, 1.25]}>
        <WheelMesh meshRef={wheelFRRef} />
      </group>
      <group position={[-0.88, -0.22, -1.25]}>
        <WheelMesh meshRef={wheelRLRef} />
      </group>
      <group position={[0.88, -0.22, -1.25]}>
        <WheelMesh meshRef={wheelRRRef} />
      </group>
      
      {/* 7. REAR SPOILER (CARBON SPORTS WING) */}
      <group position={[0, 0.55, -1.7]}>
        {/* Spoiler supports */}
        <mesh position={[-0.6, -0.15, 0]} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.15]} />
          <meshStandardMaterial color="#111" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.6, -0.15, 0]} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.15]} />
          <meshStandardMaterial color="#111" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Main spoiler blade */}
        <mesh castShadow>
          <boxGeometry args={[1.75, 0.04, 0.35]} />
          <meshStandardMaterial color="#181818" metalness={0.95} roughness={0.05} />
        </mesh>
      </group>
    </group>
  );
}
