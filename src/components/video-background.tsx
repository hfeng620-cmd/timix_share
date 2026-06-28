"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

type VideoBackgroundProps = {
  hlsSrc?: string;
  mp4Src?: string;
  poster?: string;
  desaturated?: boolean;
  topOffset?: string;
  className?: string;
};

export function VideoBackground({
  hlsSrc,
  mp4Src,
  poster,
  desaturated = false,
  topOffset,
  className = "",
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsSrc && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false, lowLatencyMode: true });
      hls.loadSource(hlsSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      return () => { hls.destroy(); };
    }

    if (mp4Src) {
      video.play().catch(() => {});
    }
  }, [hlsSrc, mp4Src]);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      poster={poster}
      className={`pointer-events-none absolute left-0 h-auto w-full object-contain ${className}`}
      style={{
        top: topOffset,
        filter: desaturated ? "saturate(0)" : undefined,
      }}
    >
      {mp4Src && <source src={mp4Src} type="video/mp4" />}
    </video>
  );
}
