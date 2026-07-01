"use client";

import { useState } from "react";
import { Coffee } from "lucide-react";

import { DonateModal } from "@/components/donate-modal";

export function DonateButton() {
  const [isDonateOpen, setIsDonateOpen] = useState(false);

  return (
    <>
      <button
        className="group relative flex shrink-0 items-center gap-2 overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-5 py-2.5 shadow-lg shadow-emerald-500/5 transition-all hover:border-emerald-500/40 hover:from-emerald-500/20 hover:to-teal-500/20"
        onClick={() => setIsDonateOpen(true)}
        type="button"
      >
        <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-teal-400/0 transition-transform duration-700 ease-in-out group-hover:translate-x-[100%]" />
        <Coffee className="relative h-4 w-4 text-emerald-400 transition-transform group-hover:scale-110" />
        <span className="relative text-sm font-medium text-emerald-100 transition-colors group-hover:text-white">
          投喂努力的站主 🥺
        </span>
      </button>

      {isDonateOpen && <DonateModal onClose={() => setIsDonateOpen(false)} />}
    </>
  );
}

