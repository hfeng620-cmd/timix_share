"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HeartHandshake, X } from "lucide-react";

import { lockBodyScroll } from "@/lib/body-scroll-lock";

type DonateModalProps = {
  onClose: () => void;
};

function DonateQrImage({
  alt,
  jpgSrc,
  pngSrc,
}: {
  alt: string;
  jpgSrc: string;
  pngSrc: string;
}) {
  const [src, setSrc] = useState(jpgSrc);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-zinc-500">
        <p className="text-sm font-bold text-zinc-700">等待上传二维码</p>
        <p className="mt-2 text-xs leading-5">
          请放入 <span className="font-mono">{jpgSrc}</span> 或 <span className="font-mono">{pngSrc}</span>
        </p>
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className="h-full w-full object-contain"
      onError={() => {
        if (src === jpgSrc) {
          setSrc(pngSrc);
          return;
        }
        setFailed(true);
      }}
      src={src}
    />
  );
}

export function DonateModal({ onClose }: DonateModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unlock = lockBodyScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      unlock();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-8 pb-4 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <HeartHandshake className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-white">感谢老板的认可与支持！</h3>
          <p className="text-sm leading-6 text-zinc-400">
            网站的服务器、数据库和抗D防御都依赖爱心发电。
            <br />
            你的每一杯咖啡，都是站主继续爆肝优化的动力 🚀
          </p>
        </div>

        <div className="px-8 pb-10">
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="group flex flex-col items-center rounded-2xl border border-[#07C160]/20 bg-zinc-900/50 p-6 transition-colors hover:border-[#07C160]/50">
              <div className="mb-4 aspect-square w-full overflow-hidden rounded-xl bg-white p-2 shadow-inner">
                <DonateQrImage alt="微信赞助" jpgSrc="/wechat-pay.jpg" pngSrc="/wechat-pay.png" />
              </div>
              <span className="flex items-center gap-2 font-bold tracking-widest text-[#07C160]">
                <span className="h-2 w-2 rounded-full bg-[#07C160] group-hover:animate-ping" />
                微信赞助
              </span>
            </div>

            <div className="group flex flex-col items-center rounded-2xl border border-[#1677FF]/20 bg-zinc-900/50 p-6 transition-colors hover:border-[#1677FF]/50">
              <div className="mb-4 aspect-square w-full overflow-hidden rounded-xl bg-white p-2 shadow-inner">
                <DonateQrImage alt="支付宝赞助" jpgSrc="/alipay.jpg" pngSrc="/alipay.png" />
              </div>
              <span className="flex items-center gap-2 font-bold tracking-widest text-[#1677FF]">
                <span className="h-2 w-2 rounded-full bg-[#1677FF] group-hover:animate-ping" />
                支付宝赞助
              </span>
            </div>
          </div>
        </div>

        <button
          aria-label="关闭赞助弹窗"
          className="absolute right-4 top-4 rounded-full bg-zinc-900/50 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

