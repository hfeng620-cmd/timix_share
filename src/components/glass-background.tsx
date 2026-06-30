"use client";

import { Environment, Float, MeshTransmissionMaterial } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function GlassShape() {
  const mesh = useRef<Mesh>(null);

  useFrame(() => {
    if (!mesh.current) return;
    mesh.current.rotation.x += 0.001;
    mesh.current.rotation.y += 0.002;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={1}>
      <mesh ref={mesh} scale={1.5}>
        <torusKnotGeometry args={[1, 0.3, 128, 32]} />
        <MeshTransmissionMaterial
          backside
          chromaticAberration={0.04}
          ior={1.5}
          roughness={0.1}
          thickness={0.5}
          transmission={1}
        />
      </mesh>
    </Float>
  );
}

export function GlassBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-80">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <Environment preset="city" />
        <GlassShape />
      </Canvas>
    </div>
  );
}

export default GlassBackground;
