"use client";

import { useRef, useState, useCallback, type RefObject } from "react";
import { uploadPostImage, insertImageAtCursor } from "@/lib/post-image-upload";

/**
 * 帖子图片上传 Hook
 * 提供: textarea ref、onPaste、uploading 状态、文件选择触发
 *
 * 用法:
 *   const { textareaRef, onPaste, uploading, triggerUpload, FileInput } = usePostImageUpload(body, setBody);
 *   <FileInput />
 *   <button onClick={triggerUpload} disabled={uploading}>📷</button>
 *   <textarea ref={textareaRef} onPaste={onPaste} value={body} onChange={...} />
 */
export function usePostImageUpload(
  body: string,
  setBody: (value: string) => void,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  /** 核心上传 + 插入 */
  const uploadAndInsert = useCallback(
    async (file: File) => {
      const ta = textareaRef.current;
      if (!ta) return;

      // 插入占位符
      const start = ta.selectionStart ?? body.length;
      const placeholder = "![上传中...]()";
      const withPlaceholder = body.slice(0, start) + placeholder + body.slice(start);
      setBody(withPlaceholder);

      // 计算占位符结束位置
      const placeholderEnd = start + placeholder.length;

      setUploading(true);
      try {
        const url = await uploadPostImage(file);
        // 用真实 URL 替换占位符
        const finalBody = withPlaceholder.replace(placeholder, `![图片](${url})`);
        setBody(finalBody);
        // 光标移到插入之后
        const newCursor = start + `![图片](${url})`.length;
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = newCursor;
            textareaRef.current.selectionEnd = newCursor;
            textareaRef.current.focus();
          }
        });
      } catch (err) {
        // 移除占位符，还原内容
        const reverted = withPlaceholder.replace(placeholder, "");
        setBody(reverted);
        throw err; // 留给调用方弹窗
      } finally {
        setUploading(false);
      }
    },
    [body, setBody],
  );

  /** 点击工具栏按钮 → 打开文件选择器 */
  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /** 文件选择后的回调 */
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await uploadAndInsert(file);
      } catch (err) {
        alert(err instanceof Error ? err.message : "图片上传失败，请稍后重试。");
      }
      // 清空 input 以允许重复选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [uploadAndInsert],
  );

  /** 剪贴板粘贴监听 */
  const onPaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            try {
              await uploadAndInsert(file);
            } catch (err) {
              alert(err instanceof Error ? err.message : "粘贴图片上传失败，请稍后重试。");
            }
          }
          break; // 仅处理第一张图片
        }
      }
    },
    [uploadAndInsert],
  );

  /** 隐藏的 <input type="file"> 组件 */
  function FileInput() {
    return (
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    );
  }

  return {
    textareaRef,
    onPaste,
    uploading,
    triggerUpload,
    FileInput,
  } as const;
}
