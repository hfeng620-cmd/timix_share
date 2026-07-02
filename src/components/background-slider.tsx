"use client";

import { useEffect, useState } from "react";

const IMAGES = ["/bg-1-hd.jpg", "/bg-3-hd.jpg", "/bg-4-hd.jpg"];
const INTERVAL_MS = 9000;

export function BackgroundSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % IMAGES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 h-full w-full">
      {IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt="Background"
          className={`absolute inset-0 h-full w-full object-cover object-center ${
            i === current
              ? "opacity-100"
              : "opacity-0"
          }`}
          style={{ transition: "opacity 2s ease-in-out" }}
        />
      ))}
      <div className="pointer-events-none absolute inset-0 bg-black/60" />
    </div>
  );
}
