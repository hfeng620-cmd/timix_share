"use client";

import { useCallback, useState } from "react";

import {
  approveDiscussionPost,
  loadPendingDiscussionPosts,
  rejectDiscussionPost,
  updateAndApprovePost,
  type DiscussionPost,
} from "@/lib/discussion-storage";
import { useForumAuth } from "@/lib/forum-auth";

export function GithubIssueReviewPanel() {
  const { isConnected, showAuthModal } = useForumAuth();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("登录管理员邮箱后可审核站内待发布讨论。");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedBody, setEditedBody] = useState("");

  const loadPending = useCallback(async () => {
    if (!isConnected) {
      setPosts([]);
      showAuthModal();
      return;
    }

    setLoading(true);
    setStatus("正在读取待审核讨论...");
    try {
      const data = await loadPendingDiscussionPosts();
      setPosts(data);
      setStatus(data.length > 0 ? `待审核 ${data.length} 条。` : "当前没有待审核讨论。");
    } catch {
      setStatus("读取失败，请确认当前邮箱在 Supabase forum_admins 管理员名单里。");
    } finally {
      setLoading(false);
    }
  }, [isConnected, showAuthModal]);

  async function review(postId: string, action: "approve" | "reject") {
    if (!isConnected) {
      showAuthModal();
      return;
    }

    setStatus(action === "approve" ? "正在通过..." : "正在驳回...");
    try {
      if (action === "approve") {
        await approveDiscussionPost(postId);
        setStatus("已通过，帖子会进入站内讨论列表。");
      } else {
        await rejectDiscussionPost(postId);
        setStatus("已驳回并删除待审核记录。");
      }
      await loadPending();
    } catch {
      setStatus("操作失败，请确认管理员权限或稍后重试。");
    }
  }

  async function updateAndApprove(postId: string) {
    if (!isConnected) {
      showAuthModal();
      return;
    }

    setStatus("正在保存改动并通过...");
    try {
      await updateAndApprovePost(postId, editedBody);
      setStatus("已保存改动并通过，帖子会进入站内讨论列表。");
      setEditingId(null);
      setEditedBody("");
      await loadPending();
    } catch {
      setStatus("操作失败，请确认管理员权限或稍后重试。");
    }
  }

  function toggleEdit(post: DiscussionPost) {
    if (editingId === post.issueNumber) {
      setEditingId(null);
      setEditedBody("");
    } else {
      setEditingId(post.issueNumber);
      setEditedBody(post.body);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Supabase 论坛审核
          </p>
          <h2 className="mt-2 text-2xl font-black text-zinc-900">论坛待审核帖子</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold text-zinc-700 transition active:bg-zinc-100 active:scale-[0.98] md:hover:bg-zinc-100"
            onClick={() => (isConnected ? void loadPending() : showAuthModal())}
            type="button"
          >
            {isConnected ? "刷新" : "登录邮箱"}
          </button>
          {isConnected && posts.length > 0 && (
            <button
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition active:bg-zinc-800 active:scale-[0.98] md:hover:bg-zinc-800 disabled:opacity-50"
              onClick={async () => {
                if (!window.confirm(`确定要通过全部 ${posts.length} 条待审核帖子吗？`)) return;
                setStatus("正在批量通过...");
                let ok = 0;
                let fail = 0;
                for (const post of posts) {
                  try {
                    await approveDiscussionPost(post.issueNumber);
                    ok++;
                  } catch {
                    fail++;
                  }
                }
                setStatus(`批量通过完成：${ok} 条成功${fail > 0 ? `，${fail} 条失败` : ""}。`);
                await loadPending();
              }}
              type="button"
            >
              全部通过 ({posts.length})
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-zinc-500">{status}</p>

      <div className="mt-5 space-y-4">
        {!isConnected ? (
          <div className="rounded-xl bg-zinc-50 px-4 py-5 text-sm leading-7 text-zinc-600">
            普通访客不需要进这里。管理员登录后可通过或驳回站内待审核帖子。
          </div>
        ) : null}

        {isConnected && loading ? (
          <div className="rounded-xl bg-zinc-50 px-4 py-5 text-sm leading-7 text-zinc-600">
            正在加载...
          </div>
        ) : null}

        {isConnected && !loading && posts.length === 0 ? (
          <div className="rounded-xl bg-zinc-50 px-4 py-5 text-sm leading-7 text-zinc-600">
            暂无待审核帖子。
          </div>
        ) : null}

        {posts.map((post) => (
          <article
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-5"
            key={post.issueNumber}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black text-zinc-900">{post.author}</h3>
                  {post.station ? (
                    <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-bold text-zinc-700">
                      {post.station}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-zinc-500">
                  {post.handle} · {post.postedAt}
                </p>
              </div>
              <span className="text-xs font-bold text-zinc-500">待审核</span>
            </div>

            {editingId === post.issueNumber ? (
              <textarea
                className="mt-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-7 text-zinc-900"
                onChange={(e) => setEditedBody(e.target.value)}
                rows={6}
                value={editedBody}
              />
            ) : (
              <div className="mt-4 flex items-start gap-2">
                <p className="flex-1 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                  {post.body}
                </p>
                <button
                  className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-600 transition active:bg-zinc-50 active:scale-[0.98] md:hover:bg-zinc-50"
                  onClick={() => toggleEdit(post)}
                  type="button"
                >
                  编辑
                </button>
              </div>
            )}

            {post.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span className="text-xs font-semibold text-zinc-500" key={`${post.issueNumber}-${tag}`}>
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              {editingId === post.issueNumber ? (
                <button
                  className="rounded-xl bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-white transition active:[background-color:var(--color-brand-deep)] active:scale-[0.98] md:hover:[background-color:var(--color-brand-deep)]"
                  onClick={() => void updateAndApprove(post.issueNumber)}
                  type="button"
                >
                  保存改动并通过
                </button>
              ) : (
                <button
                  className="rounded-xl bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-white transition active:[background-color:var(--color-brand-deep)] active:scale-[0.98] md:hover:[background-color:var(--color-brand-deep)]"
                  onClick={() => void review(post.issueNumber, "approve")}
                  type="button"
                >
                  直接通过
                </button>
              )}
              {editingId === post.issueNumber ? (
                <button
                  className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-bold text-zinc-700 transition active:bg-zinc-50 active:scale-[0.98] md:hover:bg-zinc-50"
                  onClick={() => toggleEdit(post)}
                  type="button"
                >
                  取消编辑
                </button>
              ) : null}
              <button
                className="rounded-xl bg-red-500/10 px-5 py-2.5 text-sm font-bold text-red-600 transition active:bg-red-500/20 active:scale-[0.98] md:hover:bg-red-500/20"
                onClick={() => void review(post.issueNumber, "reject")}
                type="button"
              >
                驳回
              </button>
            </div>
          </article>
        ))}
      </div>

    </section>
  );
}

