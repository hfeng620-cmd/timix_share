"use client";

import { getSupabaseClient } from "@/lib/supabase";

const BUCKET = "post_images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/svg+xml"];

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
  };
  return map[mimeType] ?? "png";
}

/**
 * 上传图片到 Supabase Storage post_images 桶，返回 public URL。
 * 文件名格式: {userId}/{timestamp}-{random}.{ext}
 */
export async function uploadPostImage(file: File): Promise<string> {
  if (!file) throw new Error("未选择文件。");
  if (file.size > MAX_SIZE) throw new Error(`图片不能超过 ${MAX_SIZE / 1024 / 1024}MB。`);
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`不支持的图片格式: ${file.type}。支持 PNG / JPEG / GIF / WebP / BMP / SVG。`);
  }

  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("请先登录后再上传图片。");

  const ext = getExtension(file.type);
  const fileName = `${userData.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  console.log("即将请求上传，目标Bucket为: [", BUCKET, "]，如果是未定义或拼写错误请立刻拦截");

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return urlData.publicUrl;
}

/**
 * 将 Markdown 图片语法 ![alt](url) 插入到 textarea 的光标位置。
 * @param textarea textarea DOM 元素
 * @param body 当前正文内容
 * @param setBody 正文 state setter
 * @param url 图片 public URL
 */
export function insertImageAtCursor(
  textarea: HTMLTextAreaElement,
  body: string,
  setBody: (value: string) => void,
  url: string,
): void {
  const start = textarea.selectionStart ?? body.length;
  const end = textarea.selectionEnd ?? start;
  const mdImage = `![图片](${url})`;
  const newBody = body.slice(0, start) + mdImage + body.slice(end);
  setBody(newBody);

  // 将光标移到插入文本之后
  const newCursor = start + mdImage.length;
  requestAnimationFrame(() => {
    textarea.selectionStart = newCursor;
    textarea.selectionEnd = newCursor;
    textarea.focus();
  });
}
