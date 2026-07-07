"use client";

import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useEffect, useState } from "react";
import { X, Clock, Loader2, ImageIcon } from "lucide-react";
import { loadEditLogs, updateFolder, updateSharePost, type EditLogEntry } from "@/lib/share-storage";
import { usePostImageUpload } from "@/lib/use-post-image-upload";

type EditMode = "folder" | "post";

type Props = {
  open: boolean;
  mode: EditMode;
  targetId: string;
  initialName: string;
  initialDesc: string;
  /** Only for post mode */
  initialBody?: string;
  initialLink?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function EditPanelModal({ open, mode, targetId, initialName, initialDesc, initialBody, initialLink, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editLogs, setEditLogs] = useState<EditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [relativeNow, setRelativeNow] = useState(() => Date.now());

  /* 图片上传 Hook */
  const { textareaRef, onPaste, uploading, triggerUpload, FileInput } = usePostImageUpload(body, setBody);

  useEffect(() => {
    if (!open) return;
    setRelativeNow(Date.now());
    setName(initialName); setDesc(initialDesc); setBody(initialBody ?? ""); setLink(initialLink ?? "");
    setError(""); setSaving(false);
    let cancelled = false;
    async function load() {
      setLogsLoading(true);
      try { const logs = await loadEditLogs(targetId, mode); if (!cancelled) setEditLogs(logs); }
      catch { if (!cancelled) setEditLogs([]); }
      finally { if (!cancelled) setLogsLoading(false); }
    }
    load();
    const unlock = lockBodyScroll();
    return () => { cancelled = true; unlock(); };
  }, [open, targetId, mode, initialName, initialDesc, initialBody, initialLink]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  async function handleSave() {
    setError(""); setSaving(true);
    try {
      if (mode === "folder") {
        await updateFolder(targetId, name, desc);
      } else {
        await updateSharePost(targetId, name, desc, body, link);
      }
      onSaved();
      onClose();
    } catch (e: any) { setError(e?.message || "保存失败"); }
    finally { setSaving(false); }
  }

  function relativeTime(dateStr: string): string {
    const d = new Date(dateStr); const mins = Math.floor((relativeNow - d.getTime()) / 60000);
    if (isNaN(mins)) return dateStr;
    if (mins < 1) return "刚刚"; if (mins < 60) return `${mins} 分钟前`;
    const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs} 小时前`;
    return `${Math.floor(hrs / 24)} 天前`;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xl px-4" onClick={onClose}>
      <div className="relative w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-3xl border border-white/15 bg-black/80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition z-20" type="button"><X className="h-4 w-4" /></button>

        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] max-h-[85vh]">
          {/* Left: Form */}
          <div className="overflow-y-auto max-h-[85vh] p-6 sm:p-8">
            <h2 className="text-xl font-heading italic text-white mb-6">
              {mode === "folder" ? "编辑板块" : "编辑帖子"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/40 font-body mb-1.5">{mode === "folder" ? "板块名称" : "标题"}</label>
                <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30 transition font-body"
                  value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-white/40 font-body mb-1.5">简介</label>
                <textarea className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30 transition font-body resize-none"
                  rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
              {mode === "post" && (
                <>
                  <div>
                    <label className="block text-xs text-white/40 font-body mb-1.5">链接</label>
                    <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30 transition font-body"
                      value={link} onChange={(e) => setLink(e.target.value)} placeholder="例如: 官网: https://a.com ;; 备用: https://b.com" />
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-light tracking-wider text-white/30">
                      <span className="text-white/50">*</span>
                      选填。如需放置多个链接，请使用双分号 <span className="rounded bg-emerald-500/10 px-1 font-mono text-emerald-500/50">;;</span> 隔开
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-white/40 font-body">正文</label>
                      <button
                        type="button"
                        onClick={triggerUpload}
                        disabled={uploading}
                        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40 font-body"
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
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30 transition font-body resize-none"
                      rows={8}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onPaste={onPaste}
                      placeholder="详细介绍该项目的特点... (Ctrl+V 粘贴截图)"
                    />
                  </div>
                </>
              )}
            </div>

            <FileInput />
            {error && <p className="mt-4 text-sm text-red-400 font-body">{error}</p>}

            <div className="mt-6 flex items-center gap-3">
              <button onClick={handleSave} disabled={saving}
                className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-50 transition font-body">
                {saving ? "保存中..." : "保存修改"}
              </button>
              <button onClick={onClose} className="rounded-full px-4 py-2.5 text-sm text-white/40 hover:text-white transition font-body">取消</button>
            </div>
          </div>

          {/* Right: Edit History */}
          <div className="overflow-y-auto max-h-[85vh] bg-white/[0.02] border-l border-white/10 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-4 w-4 text-white/40" />
              <h3 className="text-sm font-heading italic text-white/70">修改日志</h3>
            </div>
            {logsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 text-white/30 animate-spin" /></div>
            ) : editLogs.length === 0 ? (
              <p className="text-sm text-white/30 font-body">暂无修改记录</p>
            ) : (
              <div className="relative pl-6 border-l border-white/10">
                {editLogs.map((log) => (
                  <div key={log.id} className="relative pb-6 last:pb-0">
                    <div className="absolute -left-[9px] top-1 h-[18px] w-[18px] rounded-full border-2 border-white/20 bg-black" />
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-white/30 font-body">{relativeTime(log.createdAt)}</span>
                      <div className="flex items-center gap-2">
                        {log.editorAvatar ? <img src={log.editorAvatar} className="w-5 h-5 rounded-full ring-1 ring-white/10" alt="" /> : <span className="flex w-5 h-5 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50">{log.editorName.charAt(0)}</span>}
                        <span className="text-xs text-white/60 font-body">{log.editorName}</span>
                      </div>
                      <p className="text-xs text-white/40 font-body">{log.actionSummary}</p>
                      {log.totalContributions > 0 && <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50 font-body">累计贡献 {log.totalContributions} 次</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
