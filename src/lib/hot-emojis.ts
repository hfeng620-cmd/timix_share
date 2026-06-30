"use client";

export type HotEmojiItem = {
  label: string;
  preview: string;
  insertText: string;
};

export const HOT_EMOJI_ITEMS: HotEmojiItem[] = [
  { label: "狗头", preview: "🐕", insertText: "[狗头]" },
  { label: "吃瓜", preview: "🍉", insertText: "[吃瓜]" },
  { label: "泪目", preview: "🥹", insertText: "[泪目]" },
  { label: "捂脸", preview: "🫣", insertText: "[捂脸]" },
  { label: "妙啊", preview: "😏", insertText: "[妙啊]" },
  { label: "破防", preview: "💥", insertText: "[破防]" },
  { label: "点赞", preview: "👍", insertText: "[点赞]" },
  { label: "666", preview: "🔥", insertText: "[666]" },
  { label: "草", preview: "🌿", insertText: "[草]" },
  { label: "火箭", preview: "🚀", insertText: "[火箭]" },
];

export const HOT_EMOJI_MAP = new Map(HOT_EMOJI_ITEMS.map((item) => [item.insertText, item] as const));

const escapedTokens = HOT_EMOJI_ITEMS
  .map((item) => item.insertText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

export const HOT_EMOJI_TOKEN_PATTERN = new RegExp(`^(${escapedTokens})$`);

export const HOT_EMOJI_SPLIT_PATTERN = escapedTokens
  ? new RegExp(`(!\\[[^\\]]*]\\([^)]+\\)|@[\\w一-鿿]+|${escapedTokens})`, "g")
  : /(!\[[^\]]*]\([^)]+\)|@[\w一-鿿]+)/g;
