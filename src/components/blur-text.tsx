"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

type BlurTextProps = {
  text: string;
  className?: string;
  tagClassName?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p";
};

export function BlurText({
  text,
  className = "",
  tagClassName = "",
  delay = 100,
  as: Tag = "h1",
}: BlurTextProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const words = text.split(" ");

  return (
    <div ref={ref} className={className}>
      <Tag className={`flex flex-wrap ${tagClassName}`}>
        {words.map((word, i) => (
          <motion.span
            key={i}
            className="mr-[0.25em] inline-block"
            initial={{ filter: "blur(10px)", opacity: 0, y: 50 }}
            animate={isVisible ? { filter: "blur(0px)", opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.35, delay: i * (delay / 1000), ease: [0.2, 0.8, 0.2, 1] }}
          >
            {word}
          </motion.span>
        ))}
      </Tag>
    </div>
  );
}

export function BlurIn({
  children,
  className = "",
  delay = 0.8,
  duration = 0.6,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
      animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
