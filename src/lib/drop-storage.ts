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
  starts_at: string | null;
  ends_at: string | null;
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
  promo_code_id: string | null;
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
      .maybeSingle();

    if (error) {
      console.warn("[getUserSubmission] 查询失败:", error.message);
      return null;
    }
    return data as UserSubmission;
  } catch {
    return null;
  }
}

// ── 原子 RPC 调用：领取兑换码 ──

export type ClaimResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

function getClaimErrorMessage(message: string) {
  if (message.includes("ALREADY_CLAIMED")) return "您已经领取过该福利";
  if (message.includes("SOLD_OUT")) return "手慢了，兑换码已被抢空";
  if (message.includes("请先登录")) return "请先登录后再领取福利";
  if (message.includes("登录状态不匹配")) return "登录状态不匹配，请刷新后重试";
  if (message.includes("论坛资料初始化")) return "请先完成论坛资料初始化后再领取福利";
  if (message.includes("赞助商平台账号")) return "请填写有效的赞助商平台账号";
  if (message.includes("使用体验评价")) return "请选择有效的使用体验评价";
  if (message.includes("意见与建议")) return "意见与建议不能超过 1000 个字符";
  if (message.includes("您已经领取过")) return "您已经领取过该福利";
  if (message.includes("已被抢空")) return "手慢了，兑换码已被抢空";
  if (message.includes("不存在或已结束")) return "该活动不存在或已结束";
  return message || "领取失败，请稍后重试。";
}

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
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const authUserId = userData.user?.id;

    if (userError || !authUserId) {
      return { ok: false, error: "请先登录后再领取福利" };
    }

    if (authUserId !== userId) {
      return { ok: false, error: "登录状态不匹配，请刷新后重试" };
    }

    const { data, error } = await supabase.rpc("claim_promo_code", {
      p_campaign_id: campaignId,
      p_user_id: authUserId,
      p_sponsor_account: sponsorAccount.trim(),
      p_rating: rating,
      p_suggestion: suggestion.trim(),
    });

    if (error) {
      return { ok: false, error: getClaimErrorMessage(error.message) };
    }

    return { ok: true, code: String(data ?? "") };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "领取失败，请稍后重试。";
    return { ok: false, error: message };
  }
}

// ── 管理员：活动管理 ──

export type CampaignAdmin = Campaign;

export async function loadAllCampaigns(): Promise<CampaignAdmin[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await getSupabaseClient()
      .from("campaign_summary")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[loadAllCampaigns] 查询失败:", error.message);
      return [];
    }

    return (data ?? []) as CampaignAdmin[];
  } catch (error) {
    console.warn("[loadAllCampaigns] 异常:", error);
    return [];
  }
}

export async function createCampaign(params: {
  title: string;
  sponsorName: string;
  sponsorUrl: string;
  description: string;
  codeCount: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 未配置。" };
  }

  try {
    const supabase = getSupabaseClient();
    const title = params.title.trim();
    const sponsorName = params.sponsorName.trim();
    const sponsorUrl = params.sponsorUrl.trim();
    const description = params.description.trim();
    const codeCount = Math.max(1, Math.min(1000, Math.floor(params.codeCount)));

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        title,
        sponsor_name: sponsorName,
        sponsor_url: sponsorUrl,
        description,
        total_codes: codeCount,
        is_active: true,
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      return { ok: false, error: campaignError?.message ?? "创建活动失败。" };
    }

    const prefix = title
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 6)
      .toUpperCase() || "TIMIX";
    const codes = Array.from({ length: codeCount }, (_, index) => ({
      campaign_id: campaign.id,
      code: `${prefix}-${String(index + 1).padStart(3, "0")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    }));

    const { error: codeError } = await supabase.from("promo_codes").insert(codes);

    if (codeError) {
      await supabase.from("campaigns").delete().eq("id", campaign.id);
      return { ok: false, error: codeError.message };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "创建活动失败。",
    };
  }
}

export async function toggleCampaignActive(
  campaignId: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 未配置。" };
  }

  try {
    const { error } = await getSupabaseClient()
      .from("campaigns")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", campaignId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "操作失败。",
    };
  }
}

export async function deleteCampaign(
  campaignId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 未配置。" };
  }

  try {
    const { error } = await getSupabaseClient()
      .from("campaigns")
      .delete()
      .eq("id", campaignId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "删除失败。",
    };
  }
}

export async function loadCampaignSubmissions(campaignId: string): Promise<UserSubmission[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await getSupabaseClient()
      .from("drop_submissions")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[loadCampaignSubmissions] 查询失败:", error.message);
      return [];
    }

    return (data ?? []) as UserSubmission[];
  } catch (error) {
    console.warn("[loadCampaignSubmissions] 异常:", error);
    return [];
  }
}
