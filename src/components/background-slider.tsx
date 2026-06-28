"use client";

import { useEffect, useState } from "react";

const IMAGES = ["/bg-1.jpg", "/bg-2.jpg", "/bg-3.jpg", "/bg-4.jpg"];
const INTERVAL_MS = 9000;

export function BackgroundSlider() {
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setPrevious(current);
      setCurrent((prev) => (prev + 1) % IMAGES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [current]);

  return (
    <div className="fixed inset-0 z-0 h-screen w-screen">
      {IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${
            i === current
              ? "opacity-100"
              : "opacity-0"
          }`}
          style={{ transition: "opacity 2s ease-in-out" }}
        />
      ))}
      <div className="absolute inset-0 bg-black/45" />
    </div>
  );
}
