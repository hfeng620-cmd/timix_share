"use client";

import { useEffect, useRef, useState } from "react";
import { X, Folder, Plus, Loader2, Check, ImageIcon } from "lucide-react";
import type { ShareFolder } from "@/lib/share-storage";
import { usePostImageUpload } from "@/lib/use-post-image-upload";

export type CreateMode = "folder" | "post";

type Props = {
  open: boolean;
  mode: CreateMode;
  currentFolder: { id: string | null; name: string };
  folders: ShareFolder[];
  onClose: () => void;
  onCreateFolder: (name: string, desc: string, parentId: string | null) => Promise<any>;
  onCreatePost: (title: string, summary: string, body: string, link: string, folderId: string | null) => Promise<any>;
};

const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[13px] text-white font-body outline-none placeholder:text-white/25 focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all sm:px-4 sm:py-3 sm:text-sm";

export function ShareCreateModal({ open, mode, currentFolder, folders, onClose, onCreateFolder, onCreatePost }: Props) {
  const [name, setName] = useState("");
  const [folderDesc, setFolderDesc] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolder.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  /* 图片上传 Hook */
  const { textareaRef, onPaste, uploading, triggerUpload, FileInput } = usePostImageUpload(body, setBody);

  useEffect(() => {
    if (open) {
      setName(""); setFolderDesc(""); setTitle(""); setLink(""); setSummary(""); setBody("");
      setSelectedFolderId(currentFolder.id);
      setError(""); setSuccess(false); setLoading(false);
      setTimeout(() => { if (mode === "folder") nameRef.current?.focus(); else titleRef.current?.focus(); }, 100);
    }
  }, [open, mode, currentFolder.id]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  function buildOptions() {
    const map = new Map<string | null, ShareFolder[]>();
    for (const f of folders) {
      const key = f.parentId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    const result: { id: string; label: string; depth: number }[] = [];
    function walk(parentId: string | null, depth: number) {
      for (const child of map.get(parentId) ?? []) {
        result.push({ id: child.id, label: child.name, depth });
        walk(child.id, depth + 1);
      }
    }
    walk(null, 0);
    return result;
  }

  async function handleSubmit() {
    setError(""); setLoading(true);
    try {
      if (mode === "folder") {
        if (!name.trim()) { setError("请输入板块名称。"); setLoading(false); return; }
        const result = await onCreateFolder(name.trim(), folderDesc.trim(), currentFolder.id);
        setSuccess(true);
        setError(`板块创建成功！ID: ${(result as any)?.id?.slice(0,8) ?? '未知'}`);
      } else {
        if (!title.trim()) { setError("请输入分享标题。"); setLoading(false); return; }
        if (!summary.trim()) { setError("请输入分享简介。"); setLoading(false); return; }
        if (!body.trim()) { setError("请输入分享正文。"); setLoading(false); return; }
        if (!selectedFolderId) { setError("请选择所属板块。"); setLoading(false); return; }
        const result = await onCreatePost(title.trim(), summary.trim(), body.trim(), link.trim(), selectedFolderId);
        setSuccess(true);
        setError(`发布成功！ID: ${(result as any)?.id?.slice(0,8) ?? '未知'}`);
      }
    } catch (err: any) { setError(err?.message || '操作失败'); }
    finally { setLoading(false); }
  }

  if (!open) return null;
  const options = buildOptions();

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#09090b]/50 px-0 backdrop-blur-xl sm:px-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 bg-zinc-950/95 p-4 pb-[max(env(safe-area-inset-bottom,0px),1rem)] shadow-2xl backdrop-blur-xl sm:max-w-lg sm:border-white/15 sm:bg-white/6 sm:p-6" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1 shrink-0 sm:hidden" />
        <button onClick={onClose} className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/50 transition active:scale-95 active:bg-white/20 active:scale-[0.98] active:text-white md:hover:bg-white/20 md:hover:text-white sm:right-4 sm:top-4" type="button"><X className="h-5 w-5" /></button>

        <div className="mb-4 flex items-center gap-2 sm:mb-6">
          {mode === "folder" ? <Folder className="h-4 w-4 text-white/50 sm:h-5 sm:w-5" /> : <Plus className="h-4 w-4 text-white/50 sm:h-5 sm:w-5" />}
          <h2 className="text-base font-heading italic text-white sm:text-lg">{mode === "folder" ? "新建板块" : "发布分享"}</h2>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/20"><Check className="h-6 w-6 text-emerald-400" /></div>
            <p className="text-sm text-white/70 font-body">{error || (mode === "folder" ? "板块创建成功！" : "分享发布成功！")}</p>
            <p className="text-xs text-white/30 font-body">已保存，刷新后可见</p>
            <button onClick={onClose} className="mt-3 rounded-full bg-white/10 px-5 py-2 text-xs text-white/60 transition active:scale-[0.98] active:bg-white/20 md:hover:bg-white/20 font-body">完成</button>
          </div>
        ) : (
          <>
            <div className="space-y-3 sm:space-y-4">
              {mode === "folder" ? (
                <>
                  <div>
                    <label className="block text-xs text-white/40 font-body mb-1.5">板块名称</label>
                    <input ref={nameRef} type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
                      placeholder="板块名称" maxLength={100} className={inputClass}
                      onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 font-body mb-1.5">板块说明</label>
                    <textarea value={folderDesc} onChange={(e) => { setFolderDesc(e.target.value); setError(""); }}
                      placeholder="这个板块收什么内容" rows={3} maxLength={300}
                      className={`${inputClass} resize-none`} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-white/40 font-body mb-1.5">分享标题</label>
                    <input ref={titleRef} type="text" value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }}
                      placeholder="分享标题" maxLength={200} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 font-body mb-1.5">分享链接</label>
                    <input type="text" value={link} onChange={(e) => { setLink(e.target.value); setError(""); }}
                      placeholder="例如: 官网: https://a.com ;; 备用: https://b.com" className={inputClass} />
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] font-light text-white/30 sm:text-[11px]">
                      <span className="text-white/50">*</span>
                      选填，多个链接用 <span className="rounded bg-emerald-500/10 px-1 font-mono text-emerald-500/50">;;</span> 分隔
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 font-body mb-1.5">分享简介</label>
                    <textarea value={summary} onChange={(e) => { setSummary(e.target.value); setError(""); }}
                      placeholder="一两句话说明亮点" rows={2} maxLength={500}
                      className={`${inputClass} resize-none`} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-white/40 font-body">分享正文</label>
                      <button
                        type="button"
                        onClick={triggerUpload}
                        disabled={uploading}
                        className="inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors disabled:opacity-40 font-body active:text-zinc-200 active:scale-[0.98] md:hover:text-zinc-200"
                        title="上传图片 (Ctrl+V 粘贴)"
                      >
                        {uploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5" />
                        )}
                        {uploading ? "上传中..." : "图片"}
                      </button>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={body}
                      onChange={(e) => { setBody(e.target.value); setError(""); }}
                      onPaste={onPaste}
                      placeholder="特点、体验、教程都可以写。支持粘贴截图"
                      rows={5}
                      maxLength={10000}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 font-body mb-1.5">所属板块 <span className="text-red-400">*必选</span></label>
                    <select value={selectedFolderId ?? ""} onChange={(e) => setSelectedFolderId(e.target.value || null)}
                      className={`${inputClass} appearance-none cursor-pointer`}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "2.5rem" }}>
                      <option value="" className="bg-gray-900">选择板块</option>
                      {options.map((f) => (
                        <option key={f.id} value={f.id} className="bg-gray-900">{"  ".repeat(f.depth)}{f.label}</option>
                      ))}
                    </select>
                    {options.length === 0 && (
                      <p className="mt-1 text-[10px] text-amber-400 font-body">还没有板块，请先新建板块</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <FileInput />
            {error && <p className="mt-4 text-xs font-semibold text-red-400 font-body sm:text-sm" role="alert">{error}</p>}
            <div className="mt-5 flex items-center justify-end gap-2 sm:mt-6 sm:gap-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
              <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/50 transition active:scale-[0.98] active:bg-white/10 active:text-white md:hover:bg-white/10 md:hover:text-white font-body sm:px-5 sm:py-2.5 sm:text-sm" type="button" disabled={loading}>取消</button>
              <button onClick={handleSubmit} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white transition active:scale-[0.98] active:bg-white/25 md:hover:bg-white/25 font-body disabled:opacity-50 sm:px-5 sm:py-2.5 sm:text-sm" type="button">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />{mode === "folder" ? "创建中..." : "发布中..."}</> : mode === "folder" ? <><Folder className="h-4 w-4" />创建板块</> : <><Plus className="h-4 w-4" />发布分享</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
