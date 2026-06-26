"use client";

import { useEffect, useRef } from "react";

type RelayNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulse: number;
};

type RelayNetworkCanvasProps = {
  className?: string;
};

const NODE_COUNT = 22;
const BASE_CONNECTION_DISTANCE = 148;

function createNodes(width: number, height: number): RelayNode[] {
  return Array.from({ length: NODE_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.32,
    vy: (Math.random() - 0.5) * 0.28,
    radius: 1.6 + Math.random() * 2.8,
    pulse: Math.random() * Math.PI * 2,
  }));
}

export function RelayNetworkCanvas({ className }: RelayNetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: 0, y: 0, active: false };
    let reduceMotion = mediaQuery.matches;
    let width = 0;
    let height = 0;
    let frameId = 0;
    let nodes: RelayNode[] = [];

    const resizeCanvas = () => {
      width = Math.max(container.clientWidth, 1);
      height = Math.max(container.clientHeight, 1);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      nodes = createNodes(width, height);
      drawFrame(0, true);
    };

    const drawFrame = (time: number, skipMotion = false) => {
      context.clearRect(0, 0, width, height);

      const ambientGlow = context.createRadialGradient(
        width * 0.72,
        height * 0.2,
        0,
        width * 0.72,
        height * 0.2,
        Math.max(width, height) * 0.55,
      );
      ambientGlow.addColorStop(0, "rgba(37, 99, 235, 0.22)");
      ambientGlow.addColorStop(0.4, "rgba(56, 189, 248, 0.10)");
      ambientGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = ambientGlow;
      context.fillRect(0, 0, width, height);

      const pointerGlow = context.createRadialGradient(
        pointer.active ? pointer.x : width * 0.28,
        pointer.active ? pointer.y : height * 0.62,
        0,
        pointer.active ? pointer.x : width * 0.28,
        pointer.active ? pointer.y : height * 0.62,
        Math.min(width, height) * 0.42,
      );
      pointerGlow.addColorStop(0, "rgba(125, 211, 252, 0.16)");
      pointerGlow.addColorStop(1, "rgba(125, 211, 252, 0)");
      context.fillStyle = pointerGlow;
      context.fillRect(0, 0, width, height);

      if (!reduceMotion && !skipMotion) {
        for (const node of nodes) {
          node.x += node.vx;
          node.y += node.vy;
          node.pulse += 0.012;

          if (node.x <= 0 || node.x >= width) node.vx *= -1;
          if (node.y <= 0 || node.y >= height) node.vy *= -1;

          node.x = Math.min(Math.max(node.x, 0), width);
          node.y = Math.min(Math.max(node.y, 0), height);
        }
      }

      const connectionDistance = Math.min(BASE_CONNECTION_DISTANCE, width * 0.22);
      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];

        for (let innerIndex = index + 1; innerIndex < nodes.length; innerIndex += 1) {
          const target = nodes[innerIndex];
          const dx = target.x - node.x;
          const dy = target.y - node.y;
          const distance = Math.hypot(dx, dy);

          if (distance > connectionDistance) continue;

          const alpha = 1 - distance / connectionDistance;
          context.strokeStyle = `rgba(59, 130, 246, ${0.08 + alpha * 0.18})`;
          context.lineWidth = 0.8;
          context.beginPath();
          context.moveTo(node.x, node.y);
          context.lineTo(target.x, target.y);
          context.stroke();
        }

        if (pointer.active) {
          const dx = pointer.x - node.x;
          const dy = pointer.y - node.y;
          const pointerDistance = Math.hypot(dx, dy);
          const pointerReach = Math.min(180, width * 0.28);

          if (pointerDistance < pointerReach) {
            const alpha = 1 - pointerDistance / pointerReach;
            context.strokeStyle = `rgba(125, 211, 252, ${0.06 + alpha * 0.18})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(node.x, node.y);
            context.lineTo(pointer.x, pointer.y);
            context.stroke();
          }
        }
      }

      for (const node of nodes) {
        const pulse = 0.75 + Math.sin(node.pulse + time * 0.0005) * 0.25;
        context.fillStyle = `rgba(255, 255, 255, ${0.72 + pulse * 0.16})`;
        context.beginPath();
        context.arc(node.x, node.y, node.radius + pulse * 0.6, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = `rgba(37, 99, 235, ${0.16 + pulse * 0.12})`;
        context.beginPath();
        context.arc(node.x, node.y, node.radius * 3.8, 0, Math.PI * 2);
        context.fill();
      }
    };

    const animate = (time: number) => {
      drawFrame(time);
      if (!reduceMotion) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active =
        pointer.x >= 0 &&
        pointer.x <= bounds.width &&
        pointer.y >= 0 &&
        pointer.y <= bounds.height;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const handleMotionChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      window.cancelAnimationFrame(frameId);
      drawFrame(0, true);
      if (!reduceMotion) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    resizeCanvas();
    if (!reduceMotion) {
      frameId = window.requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);
    mediaQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.26),transparent_42%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(244,247,251,0),rgba(244,247,251,0.82))]" />
    </div>
  );
}
