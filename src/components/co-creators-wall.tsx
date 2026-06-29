"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { ThankYouModal } from "@/components/thank-you-modal";

export type CoCreator = {
  id: string;
  avatarUrl: string | null;
  nickname: string;
  role: "founder" | "admin" | "contributor";
};

export function CoCreatorsWall() {
  const [creators, setCreators] = useState<CoCreator[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thankOpen, setThankOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    async function load() {
      try {
        const supabase = getSupabaseClient();
        // Get unique authors from shared_posts
        const { data: posts } = await supabase.from("shared_posts").select("author_id, forum_profiles!inner(display_name, avatar_url)").order("created_at", { ascending: false }).limit(50);
        if (!posts) return;
        const seen = new Set<string>();
        const list: CoCreator[] = [];
        // Check site_owners & forum_admins for role
        const [{ data: owners }, { data: admins }] = await Promise.all([
          supabase.from("site_owners").select("user_id"),
          supabase.from("forum_admins").select("user_id"),
        ]);
        const ownerIds = new Set((owners ?? []).map((o: any) => o.user_id));
        const adminIds = new Set((admins ?? []).map((a: any) => a.user_id));
        for (const p of posts as any[]) {
          const uid = p.author_id;
          if (seen.has(uid)) continue; seen.add(uid);
          const profile = p.forum_profiles as any;
          list.push({
            id: uid,
            avatarUrl: profile?.avatar_url ?? null,
            nickname: profile?.display_name ?? "未知用户",
            role: ownerIds.has(uid) ? "founder" : adminIds.has(uid) ? "admin" : "contributor",
          });
        }
        setCreators(list);
      } catch {}
    }
    load();
  }, []);

  useEffect(() => {
    if (creators.length <= 1) return;
    const timer = setInterval(() => setCurrentIndex((p) => (p + 1) % creators.length), 3000);
    return () => clearInterval(timer);
  }, [creators.length]);

  if (creators.length === 0) return null;

  const founder = creators.find((c) => c.role === "founder") ?? creators[0];

  return (
    <>
      <div className="flex items-center gap-4 py-4">
        {/* Avatar area */}
        <div className="relative flex items-center gap-2">
          <div className="relative w-10 h-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                {creators[currentIndex]?.avatarUrl ? (
                  <img src={creators[currentIndex].avatarUrl!} className="w-10 h-10 rounded-full ring-1 ring-white/20 object-cover" alt="" />
                ) : (
                  <span className="flex w-10 h-10 items-center justify-center rounded-full bg-white/10 text-sm text-white/60 ring-1 ring-white/20">
                    {(creators[currentIndex]?.nickname ?? "U").charAt(0)}
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Text */}
        <div className="text-sm text-white/40 font-body">
          由 <span className="text-white/60">{founder.nickname}</span> 创建
          {creators.length > 1 && (
            <span>，及 <span className="text-white/60">{creators.length - 1}</span> 位共创者共同维护</span>
          )}
        </div>

        {/* Thank button */}
        <button
          onClick={() => setThankOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors duration-300 font-body"
          type="button"
        >
          <Heart className="h-3.5 w-3.5" />
          致谢
        </button>
      </div>

      <ThankYouModal open={thankOpen} onClose={() => setThankOpen(false)} creators={creators} />
    </>
  );
}
