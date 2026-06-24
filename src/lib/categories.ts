export type CategoryInfo = {
  key: string;
  label: string;
  tagValue: string;
  color: string;
};

export const CATEGORIES: CategoryInfo[] = [
  { key: "价格变化", label: "价格变化", tagValue: "cat:价格变化", color: "#B8860B" },
  { key: "使用反馈", label: "使用反馈", tagValue: "cat:使用反馈", color: "#5B8A7C" },
  { key: "新站线索", label: "新站线索", tagValue: "cat:新站线索", color: "#7B8C5A" },
  { key: "避坑提醒", label: "避坑提醒", tagValue: "cat:避坑提醒", color: "#C46A5A" },
  { key: "闲聊讨论", label: "闲聊讨论", tagValue: "cat:闲聊讨论", color: "#8B8680" },
];

export const DEFAULT_CATEGORY = CATEGORIES[1]; // "使用反馈"

const CAT_PREFIX = "cat:";

/** Check if a tag is a category tag (starts with "cat:"). */
export function isCategoryTag(tag: string): boolean {
  return tag.startsWith(CAT_PREFIX);
}

/** Parse the first category tag from a tag list. Returns null if none found. */
export function parseCategoryFromTags(tags: string[]): CategoryInfo | null {
  for (const tag of tags) {
    if (isCategoryTag(tag)) {
      const key = tag.slice(CAT_PREFIX.length);
      return CATEGORIES.find((c) => c.key === key) ?? null;
    }
  }
  return null;
}

/** Get the left-border accent color for a post based on its category tag. */
export function getCategoryBorderColor(tags: string[]): string | undefined {
  return parseCategoryFromTags(tags)?.color;
}
