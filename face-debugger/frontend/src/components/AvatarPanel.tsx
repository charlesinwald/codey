import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

interface AvatarPanelProps {
  isSpeaking: boolean;
  modelUrl?: string;
}

/**
 * Fallback geometric avatar when no GLTF model is provided.
 * A simple robot-like head that bobs when "speaking".
 */
function FallbackAvatar({ isSpeaking }: { isSpeaking: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Idle breathing animation
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(t * 2) * 0.02;

    // Speaking animation - more pronounced bobbing
    if (isSpeaking) {
      groupRef.current.position.y += Math.sin(t * 8) * 0.03;
      groupRef.current.rotation.z = Math.sin(t * 6) * 0.02;
    }

    // Occasional blinking
    if (leftEyeRef.current && rightEyeRef.current) {
      const blinkPhase = Math.sin(t * 0.5) > 0.95;
      const scale = blinkPhase ? 0.1 : 1;
      leftEyeRef.current.scale.y = scale;
      rightEyeRef.current.scale.y = scale;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Head */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.2, 1.4, 1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Face plate */}
      <mesh position={[0, 0.5, 0.45]}>
        <boxGeometry args={[1, 1.1, 0.15]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Left eye */}
      <mesh ref={leftEyeRef} position={[-0.25, 0.65, 0.53]}>
        <boxGeometry args={[0.2, 0.15, 0.05]} />
        <meshStandardMaterial
          color={isSpeaking ? "#22c55e" : "#3b82f6"}
          emissive={isSpeaking ? "#22c55e" : "#3b82f6"}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Right eye */}
      <mesh ref={rightEyeRef} position={[0.25, 0.65, 0.53]}>
        <boxGeometry args={[0.2, 0.15, 0.05]} />
        <meshStandardMaterial
          color={isSpeaking ? "#22c55e" : "#3b82f6"}
          emissive={isSpeaking ? "#22c55e" : "#3b82f6"}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Mouth / speaker grille */}
      <mesh position={[0, 0.25, 0.53]}>
        <boxGeometry args={[0.5, 0.15, 0.05]} />
        <meshStandardMaterial
          color={isSpeaking ? "#f59e0b" : "#475569"}
          emissive={isSpeaking ? "#f59e0b" : "#000000"}
          emissiveIntensity={isSpeaking ? 0.8 : 0}
        />
      </mesh>

      {/* Antenna */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.08]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Neck */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.4]} />
        <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Shoulders hint */}
      <mesh position={[0, -0.6, 0]}>
        <boxGeometry args={[1.8, 0.3, 0.8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}

/**
 * GLTF model avatar with speaking animation.
 */
function GLTFAvatar({
  modelUrl,
  isSpeaking,
}: {
  modelUrl: string;
  isSpeaking: boolean;
}) {
  const { scene } = useGLTF(modelUrl);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();

    // Idle animation
    groupRef.current.position.y = Math.sin(t * 2) * 0.01;

    // Speaking animation
    if (isSpeaking) {
      groupRef.current.position.y += Math.sin(t * 8) * 0.02;
      groupRef.current.rotation.y = Math.sin(t * 3) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={1} />
    </group>
  );
}

/**
 * Loading fallback for Suspense.
 */
function LoadingFallback() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#3b82f6" wireframe />
    </mesh>
  );
}

/**
 * Three.js avatar panel component.
 * Renders either a GLTF model or a fallback geometric avatar.
 */
export function AvatarPanel({ isSpeaking, modelUrl }: AvatarPanelProps) {
  return (
    <div className="w-full h-full bg-ide-bg">
      <Canvas
        camera={{ position: [0, 0.5, 3], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.3} />

        {/* Environment for reflections */}
        <Environment preset="city" />

        {/* Avatar */}
        <Suspense fallback={<LoadingFallback />}>
          {modelUrl ? (
            <GLTFAvatar modelUrl={modelUrl} isSpeaking={isSpeaking} />
          ) : (
            <FallbackAvatar isSpeaking={isSpeaking} />
          )}
        </Suspense>

        {/* Ground shadow */}
        <ContactShadows
          position={[0, -0.8, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
        />

        {/* Camera controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={2}
          maxDistance={6}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0.3, 0]}
        />
      </Canvas>
    </div>
  );
}
