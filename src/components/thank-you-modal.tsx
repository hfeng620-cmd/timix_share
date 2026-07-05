"use client";

import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, Shield, Star, User } from "lucide-react";
import type { CoCreator } from "@/components/co-creators-wall";
import { useForumAuth } from "@/lib/forum-auth";

type Props = {
  open: boolean;
  onClose: () => void;
  creators: CoCreator[];
};

const THANK_TEXT = "TiMix 并非只属于一个人，它是由无数热衷于前沿技术的开发者共同构筑的数字家园。无论是一次代码的提交，还是一份配置的分享，都让这个平台更进一步。由衷感谢每一位驻足于此、赋予它生命力的共建者。";

export function ThankYouModal({ open, onClose, creators }: Props) {
  const { isAdmin, isOwner } = useForumAuth();
  const canEdit = isAdmin || isOwner;

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    const unlock = lockBodyScroll();
    return () => { document.removeEventListener("keydown", h); unlock(); };
  }, [open, onClose]);

  if (!open) return null;

  function roleIcon(role: string) {
    if (role === "founder") return <Star className="h-3 w-3 text-amber-400" />;
    if (role === "admin") return <Shield className="h-3 w-3 text-zinc-300" />;
    return <User className="h-3 w-3 text-zinc-500" />;
  }

  function roleLabel(role: string) {
    if (role === "founder") return "站主";
    if (role === "admin") return "管理员";
    return "共创者";
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xl px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
        className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950/90 p-8 sm:p-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/30 hover:text-white transition-colors" type="button">
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-heading italic text-white">共建者致谢</h2>
        </div>

        {/* Thank you text */}
        <p className="text-sm leading-relaxed text-white/45 font-body text-center max-w-lg mx-auto mb-10">
          {THANK_TEXT}
        </p>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {creators.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 p-3 transition-all duration-700 hover:bg-white/[0.06]">
              {c.avatarUrl ? (
                <img src={c.avatarUrl} className="w-8 h-8 rounded-full ring-1 ring-white/10 object-cover shrink-0" alt="" />
              ) : (
                <span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-white/50">{c.nickname.charAt(0)}</span>
              )}
              <div className="min-w-0">
                <p className="text-sm text-white/70 font-body truncate">{c.nickname}</p>
                <p className="flex items-center gap-1 text-[10px] text-white/30 font-body">
                  {roleIcon(c.role)}
                  {roleLabel(c.role)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Admin edit hint */}
        {canEdit && (
          <p className="mt-8 text-center text-[10px] text-white/20 font-body">
            管理员可在 Supabase 管理共建者名单
          </p>
        )}

        <p className="mt-6 text-center text-[10px] text-white/15 font-body">
          ✨ 感谢每一位贡献者
        </p>
      </motion.div>
    </motion.div>
  );
}
