const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);

export function getSafeExternalHref(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizeEditableExternalHref(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  const safeHref = getSafeExternalHref(trimmed);
  if (!safeHref) {
    throw new Error("网址仅支持完整的 http:// 或 https:// 链接。");
  }

  return safeHref;
}
