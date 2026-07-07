"use client";

import type { Liker } from "@/lib/share-storage";

function isOwnerLiker(liker: Liker) {
  return liker.role === "owner";
}

function isAdminLiker(liker: Liker) {
  return liker.role === "admin";
}

export function LikeIndicator({ likers }: { likers: Liker[] }) {
  if (!likers || likers.length === 0) return null;

  const vipLikers = likers.filter((liker) => isOwnerLiker(liker) || isAdminLiker(liker));
  const friendLikers = likers.filter((liker) => !isOwnerLiker(liker) && !isAdminLiker(liker));
  const firstFriend = friendLikers[0];

  return (
    <div className="ml-2 flex flex-wrap items-center gap-2 text-xs font-body">
      {vipLikers.map((liker) => {
        const isOwner = isOwnerLiker(liker);
        return (
          <span
            key={liker.userId}
            className={`rounded-md border px-2 py-1 font-bold ${
              isOwner
                ? "border-red-500/20 bg-red-500/10 text-red-500"
                : "border-blue-500/20 bg-blue-500/10 text-blue-400"
            }`}
          >
            {isOwner ? "👑 站主赞过" : `🛡️ 管理员 ${liker.displayName || ""} 赞过`}
          </span>
        );
      })}
      {firstFriend && (
        <span className="rounded-md border border-cyan-400/15 bg-cyan-400/10 px-2 py-1 font-medium text-cyan-200">
          {firstFriend.displayName || "有朋友"}{friendLikers.length > 1 ? " 等朋友赞过" : " 赞过"}
        </span>
      )}
    </div>
  );
}
