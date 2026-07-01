"use client";

import { Environment, Float, MeshTransmissionMaterial } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function GlassGeometry() {
  const mesh = useRef<Mesh>(null);

  useFrame((_state, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.x += delta * 0.1;
    mesh.current.rotation.y += delta * 0.15;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={mesh} scale={1.8}>
        <torusKnotGeometry args={[1, 0.4, 128, 32]} />
        <MeshTransmissionMaterial
          backside
          chromaticAberration={0.03}
          ior={1.5}
          roughness={0.15}
          thickness={1.2}
          transmission={1}
        />
      </mesh>
    </Float>
  );
}

export function GlassBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-90 transition-opacity duration-1000">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={2} />
        <Environment preset="city" />
        <GlassGeometry />
      </Canvas>
    </div>
  );
}

export default GlassBackground;
