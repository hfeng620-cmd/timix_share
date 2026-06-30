"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

// ── 类型定义 ──

export type Campaign = {
  id: string;
  title: string;
  sponsor_name: string;
  sponsor_url: string;
  description: string;
  total_codes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  remaining_codes: number;
  claimed_codes: number;
  total_code_records: number;
};

export type UserSubmission = {
  id: string;
  campaign_id: string;
  user_id: string;
  sponsor_account: string;
  rating: string;
  suggestion: string;
  created_at: string;
};

// ── 加载活动列表（含汇总统计）──

export async function loadCampaigns(): Promise<Campaign[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await getSupabaseClient()
      .from("campaign_summary")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[loadCampaigns] 查询失败:", error.message);
      return [];
    }

    return (data ?? []) as Campaign[];
  } catch (error) {
    console.warn("[loadCampaigns] 异常:", error);
    return [];
  }
}

// ── 检查用户是否已领取某个活动 ──

export async function getUserSubmission(
  campaignId: string,
  userId: string,
): Promise<UserSubmission | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await getSupabaseClient()
      .from("drop_submissions")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("user_id", userId)
      .single();

    if (error) return null;
    return data as UserSubmission;
  } catch {
    return null;
  }
}

// ── 原子 RPC 调用：领取兑换码 ──

export type ClaimResult =
  | { ok: true; code: string }
  | { ok: false; error: string; errorCode?: "ALREADY_CLAIMED" | "SOLD_OUT" | "CAMPAIGN_NOT_FOUND" };

export async function claimPromoCode(
  campaignId: string,
  userId: string,
  sponsorAccount: string,
  rating: string,
  suggestion: string,
): Promise<ClaimResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 未配置，无法领取福利。" };
  }

  try {
    const { data, error } = await getSupabaseClient().rpc("claim_promo_code", {
      p_campaign_id: campaignId,
      p_user_id: userId,
      p_sponsor_account: sponsorAccount.trim(),
      p_rating: rating,
      p_suggestion: suggestion.trim(),
    });

    if (error) {
      // 识别 PostgreSQL RAISE EXCEPTION 的英文错误码
      if (error.message.includes("ALREADY_CLAIMED")) {
        return { ok: false, error: "您已经领取过该福利", errorCode: "ALREADY_CLAIMED" };
      }
      if (error.message.includes("SOLD_OUT")) {
        return { ok: false, error: "手慢了，兑换码已被抢空", errorCode: "SOLD_OUT" };
      }
      if (error.message.includes("CAMPAIGN_NOT_FOUND")) {
        return { ok: false, error: "该活动不存在或已结束", errorCode: "CAMPAIGN_NOT_FOUND" };
      }

      return { ok: false, error: error.message };
    }

    return { ok: true, code: String(data ?? "") };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "领取失败，请稍后重试。";
    return { ok: false, error: message };
  }
}
