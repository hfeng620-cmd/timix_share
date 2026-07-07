"use client";

import { useEffect, useRef, useState } from "react";
import EmojiPicker, { Categories, Theme, type EmojiClickData } from "emoji-picker-react";
import { ChevronDown, Smile } from "lucide-react";

import { HOT_EMOJI_ITEMS } from "@/lib/hot-emojis";

const HOT_EMOJI_HINTS: Record<string, string[]> = {
  "[666]": ["/666", "/nb"],
  "[吃瓜]": ["/cg", "/吃瓜"],
  "[妙啊]": ["/ma", "/妙啊"],
  "[泪目]": ["/lm", "/泪目"],
  "[点赞]": ["/dz", "/点赞"],
  "[狗头]": ["/gt", "/狗头"],
  "[火箭]": ["/hj", "/火箭"],
  "[破防]": ["/pf", "/破防"],
  "[捂脸]": ["/wl", "/捂脸"],
  "[草]": ["/cao", "/草"],
};

const COMMON_NATIVE_EMOJIS = ["😀", "😂", "🤭", "🥹", "😅", "😎", "🤔", "😲", "😭", "👍", "👀", "❤️", "💔", "🍉", "🎉", "🚀"];

type EmojiPickerButtonProps = {
  open: boolean;
  disabled?: boolean;
  align?: "left" | "right";
  buttonClassName?: string;
  iconClassName?: string;
  pickerClassName?: string;
  onClose: () => void;
  onToggle: () => void;
  onEmojiSelect: (emoji: string) => void;
};

export function EmojiPickerButton({
  open,
  disabled = false,
  align = "left",
  buttonClassName = "",
  iconClassName = "h-4 w-4",
  pickerClassName = "",
  onClose,
  onToggle,
  onEmojiSelect,
}: EmojiPickerButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showNativePicker, setShowNativePicker] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setShowNativePicker(false);
    }
  }, [open]);

  function handleEmojiClick(emojiData: EmojiClickData) {
    onEmojiSelect(emojiData.emoji);
    onClose();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={buttonClassName}
        disabled={disabled}
        onClick={onToggle}
        title="插入表情"
        type="button"
      >
        <Smile className={iconClassName} />
      </button>

      {open ? (
        <div
          className={`absolute bottom-full mb-3 z-[220] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl ${
            align === "right" ? "right-0" : "left-0"
          } ${pickerClassName}`}
        >
          <div className="border-b border-white/10 px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-[0.18em] text-zinc-500">热门表情</p>
                <p className="mt-1 text-[11px] text-zinc-600">先放常用的，狗头和 B 站味重一点的都在这里。</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-zinc-500">
                `/gt` 这类缩写可用
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {HOT_EMOJI_ITEMS.map((item) => (
                <button
                  key={item.insertText}
                  className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-xs transition ${
                    item.insertText === "[狗头]"
                      ? "border-amber-300/20 bg-amber-400/10 text-amber-50 active:border-amber-200/40 active:scale-[0.98] active:bg-amber-300/15 md:hover:border-amber-200/40 md:hover:bg-amber-300/15"
                      : "border-white/10 bg-white/[0.04] text-zinc-300 active:border-white/20 active:scale-[0.98] active:bg-white/[0.08] active:text-white md:hover:border-white/20 md:hover:bg-white/[0.08] md:hover:text-white"
                  }`}
                  onClick={() => {
                    onEmojiSelect(item.insertText);
                    onClose();
                  }}
                  title={(HOT_EMOJI_HINTS[item.insertText] ?? []).join("  ")}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg ${
                      item.insertText === "[狗头]" ? "bg-amber-200/15" : "bg-white/[0.06]"
                    }`}
                  >
                    {item.preview}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-[10px] text-zinc-500 transition active:text-zinc-300 md:group-hover:text-zinc-300">
                      {(HOT_EMOJI_HINTS[item.insertText] ?? []).join("  ")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium tracking-[0.18em] text-zinc-500">常用原生</p>
              <button
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-zinc-400 transition active:border-white/20 active:scale-[0.98] active:text-white md:hover:border-white/20 md:hover:text-white"
                onClick={() => setShowNativePicker((current) => !current)}
                type="button"
              >
                更多原生
                <ChevronDown className={`h-3 w-3 transition ${showNativePicker ? "rotate-180" : ""}`} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {COMMON_NATIVE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg transition active:border-white/20 active:scale-[0.98] active:bg-white/[0.08] md:hover:border-white/20 md:hover:bg-white/[0.08]"
                  onClick={() => {
                    onEmojiSelect(emoji);
                    onClose();
                  }}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          {showNativePicker ? (
            <div className="border-t border-white/10 px-3 py-3">
              <EmojiPicker
                categories={[
                  { category: Categories.SMILEYS_PEOPLE, name: "常用表情" },
                  { category: Categories.ANIMALS_NATURE, name: "动物自然" },
                  { category: Categories.SYMBOLS, name: "符号" },
                ]}
                height={320}
                lazyLoadEmojis
                onEmojiClick={handleEmojiClick}
                previewConfig={{ showPreview: false }}
                searchPlaceholder="搜一下原生表情"
                skinTonesDisabled
                theme={Theme.DARK}
                width={330}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
