"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeEditableExternalHref } from "@/lib/url-safety";

export type Station = {
  id: string;
  name: string;
  url: string;
  price: string;
  multiplier: string;
  entry: string;
  packageType: string;
  status: string;
  models: string;
  uptime: string;
  latency: string;
  source: string;
  verdict: string;
  note: string;
  advantage: string;
  risk: string;
  badge: string;
  groupName: string;
  sortOrder: number;
  lastEditorName?: string;
  lastEditAt?: string;
};

export type StationEditRecord = {
  id: string;
  stationId: string;
  editorId: string;
  editorName: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
};

export type StationEditRequestPayload = Partial<
  Pick<
    Station,
    | "price"
    | "multiplier"
    | "packageType"
    | "status"
    | "models"
    | "uptime"
    | "latency"
    | "risk"
    | "note"
  >
>;

export const STATIONS_CHANGED_EVENT = "timix:stations-changed";

export function notifyStationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STATIONS_CHANGED_EVENT));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Map the view/table row (snake_case) to our camelCase Station type. */
function stationFromRow(row: Record<string, unknown>): Station {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    url: String(row.url ?? ""),
    price: String(row.price ?? ""),
    multiplier: String(row.multiplier ?? ""),
    entry: String(row.entry ?? ""),
    packageType: String(row.package_type ?? ""),
    status: String(row.status ?? ""),
    models: String(row.models ?? ""),
    uptime: String(row.uptime ?? ""),
    latency: String(row.latency ?? ""),
    source: String(row.source ?? ""),
    verdict: String(row.verdict ?? ""),
    note: String(row.note ?? ""),
    advantage: String(row.advantage ?? ""),
    risk: String(row.risk ?? ""),
    badge: String(row.badge ?? ""),
    groupName: String(row.group_name ?? ""),
    sortOrder: Number(row.sort_order ?? 0),
    lastEditorName: row.last_editor_name
      ? String(row.last_editor_name)
      : undefined,
    lastEditAt: row.last_edit_at ? String(row.last_edit_at) : undefined,
  };
}

/** Map a Station update object (camelCase) to a snake_case record for Supabase. */
function stationToUpdate(updates: Partial<Station>): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  if (updates.name !== undefined) record.name = updates.name;
  if (updates.url !== undefined) record.url = updates.url;
  if (updates.price !== undefined) record.price = updates.price;
  if (updates.multiplier !== undefined) record.multiplier = updates.multiplier;
  if (updates.entry !== undefined) record.entry = updates.entry;
  if (updates.packageType !== undefined)
    record.package_type = updates.packageType;
  if (updates.status !== undefined) record.status = updates.status;
  if (updates.models !== undefined) record.models = updates.models;
  if (updates.uptime !== undefined) record.uptime = updates.uptime;
  if (updates.latency !== undefined) record.latency = updates.latency;
  if (updates.source !== undefined) record.source = updates.source;
  if (updates.verdict !== undefined) record.verdict = updates.verdict;
  if (updates.note !== undefined) record.note = updates.note;
  if (updates.advantage !== undefined) record.advantage = updates.advantage;
  if (updates.risk !== undefined) record.risk = updates.risk;
  if (updates.badge !== undefined) record.badge = updates.badge;
  if (updates.groupName !== undefined) record.group_name = updates.groupName;
  if (updates.sortOrder !== undefined) record.sort_order = updates.sortOrder;
  return record;
}

/** camelCase field name → snake_case column name mapping for edits. */
const CAMEL_TO_SNAKE: Record<string, string> = {
  packageType: "package_type",
  groupName: "group_name",
  sortOrder: "sort_order",
  lastEditorName: "last_editor_name",
  lastEditAt: "last_edit_at",
};

const EDITABLE_STATION_FIELDS = new Set([
  "name",
  "url",
  "price",
  "multiplier",
  "entry",
  "package_type",
  "status",
  "models",
  "uptime",
  "latency",
  "source",
  "verdict",
  "note",
  "advantage",
  "risk",
  "badge",
  "group_name",
  "sort_order",
]);

function toSnakeCase(field: string): string {
  return CAMEL_TO_SNAKE[field] ?? field;
}

function assertEditableStationField(fieldName: string) {
  if (!EDITABLE_STATION_FIELDS.has(fieldName)) {
    throw new Error("这个字段不允许通过协作编辑修改。");
  }
}

function sanitizeStationUpdates(updates: Partial<Station>): Partial<Station> {
  const sanitized: Partial<Station> = {};

  for (const [camelKey, value] of Object.entries(updates) as Array<[keyof Station, Station[keyof Station]]>) {
    if (camelKey === "id") continue;

    const snakeKey = toSnakeCase(String(camelKey));
    if (!EDITABLE_STATION_FIELDS.has(snakeKey)) continue;

    Object.assign(sanitized, { [camelKey]: value });
  }

  return sanitized;
}

/** Map a station_edits row (snake_case) to our camelCase StationEditRecord. */
function editRecordFromRow(row: Record<string, unknown>): StationEditRecord {
  return {
    id: String(row.id ?? ""),
    stationId: String(row.station_id ?? ""),
    editorId: String(row.editor_id ?? ""),
    editorName: String(row.editor_name ?? ""),
    fieldName: String(row.field_name ?? ""),
    oldValue: String(row.old_value ?? ""),
    newValue: String(row.new_value ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function normalizeStationUrl(url?: string) {
  return normalizeEditableExternalHref(url);
}

export function isOfficialStationId(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}

export function isTemporaryStationId(value: string | null | undefined) {
  return Boolean(value?.startsWith("static-"));
}

function isPermissionError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  return (
    error.code === "42501" ||
    /row-level security|permission denied|not authorized|violates row-level/i.test(message)
  );
}

function stationWritePermissionMessage(action: string) {
  return `数据库暂时还没放开登录用户${action}正式榜单，请先执行 supabase/station-open-editing-migration.sql 后再试。`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Load all approved stations, ordered by sort_order. */
export async function loadStations(): Promise<Station[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await getSupabaseClient()
    .from("stations")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[loadStations] Error:", error);
    throw new Error(`加载站点数据失败: ${error.message}`);
  }
  return ((data ?? []) as Record<string, unknown>[]).map(stationFromRow);
}

/** Move a station up (direction=-1) or down (direction=1) by swapping sort_order with its neighbor. */
export async function reorderStation(id: string, direction: -1 | 1): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (!isOfficialStationId(id)) {
    if (isTemporaryStationId(id)) {
      throw new Error("这条站点还是本地兜底数据，不能直接排序；请先导入模板或保存为正式站点。");
    }
    throw new Error("站点ID无效，无法排序。");
  }
  const supabase = getSupabaseClient();

  // Get current station's sort_order
  const { data: current, error: curErr } = await supabase
    .from("stations")
    .select("id, sort_order")
    .eq("id", id)
    .single();
  if (curErr || !current) throw new Error("站点未找到");

  // Find the adjacent station
  const comp = direction === -1 ? "lt" : "gt";
  const order = direction === -1 ? { ascending: false } : { ascending: true };
  const { data: neighbor, error: neighErr } = await supabase
    .from("stations")
    .select("id, sort_order")
    .filter("sort_order", comp, current.sort_order)
    .order("sort_order", order)
    .limit(1)
    .maybeSingle();
  if (neighErr) throw new Error(`查找相邻站点失败: ${neighErr.message}`);
  if (!neighbor) return; // Already at edge

  // Swap sort_order values
  const { error: up1 } = await supabase
    .from("stations")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", id);
  if (up1) throw new Error(`更新排序失败: ${up1.message}`);

  const { error: up2 } = await supabase
    .from("stations")
    .update({ sort_order: current.sort_order })
    .eq("id", neighbor.id);
  if (up2) throw new Error(`更新排序失败: ${up2.message}`);

  notifyStationsChanged();
}

/** Seed default stations from the SQL seed data — idempotent, skips existing names. */
export async function seedDefaultStations(): Promise<number> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置");
  const defaults = [
    { name: "虎虎", badge: "双口径", url: "https://huhuai.xyz/register?aff=BCPA5AKW3KHX", price: "Plus 0.13 / Pro 0.16", multiplier: "0.13x 起", entry: "注册送额度入口", packageType: "倍率制", status: "试用信息清晰", models: "主流模型待群补", verdict: "先试再说", note: "当前走注册链接送额度；历史填表活动留档。", advantage: "试用入口清晰，适合新用户优先体验。", risk: "实际长期价格和稳定性还要继续看群友反馈。", groupName: "huhuai.xyz", sortOrder: 1 },
    { name: "Aether", badge: "常用", url: "https://to-aether.com/dashboard", price: "0.263 倍率", multiplier: "0.263x", entry: "Dashboard 直链", packageType: "倍率制", status: "可调用 GPT 5.5 / 5.4，社区常用", models: "可调用 GPT 5.5 / 5.4", verdict: "价格还行，口碑偏稳", note: "群里常用，价格不算最低但反馈偏稳。", advantage: "价格不差，当前备注里稳定性印象较好。", risk: "缺少结构化实测数据，仍需要群友补高峰反馈。", groupName: "", sortOrder: 2 },
    { name: "杂货铺", badge: "双口径", url: "https://api.dstopology.com/keys", price: "GPT 0.058 / CC Max 0.89", multiplier: "0.058x 起", entry: "Keys 页面", packageType: "模型分组计价", status: "需要分开理解", models: "GPT / CC Max", verdict: "一定要按模型分开看", note: "GPT 与 CC Max 分开计价，不要只看最低值。", advantage: "很适合展示同站不同模型收费完全不同的真实情况。", risk: "如果只看最低值，很容易误读 CC Max 的实际价格。", groupName: "", sortOrder: 3 },
    { name: "秋天中转站", badge: "新收录", url: "https://qiutian.live", price: "待补录", multiplier: "待补录", entry: "官网入口", packageType: "模型接入已确认 / 价格待补", status: "可调用 GPT 5.5 / 5.4", models: "可调用 GPT 5.5 / 5.4", verdict: "先收录官网入口", note: "qiutian.live 已补入口，可调用 GPT 5.5 / 5.4。", advantage: "模型接入口径已明确，方便后续群友补测价格。", risk: "当前仍缺可直接比较的价格和倍率信息。", groupName: "", sortOrder: 4 },
    { name: "dasuAPI", badge: "待补测", url: "https://dasuapi.com", price: "待补录", multiplier: "待补录", entry: "官网入口", packageType: "模型接入已确认 / 价格待补", status: "可调用 GPT 5.5 / 5.4", models: "可调用 GPT 5.5 / 5.4", verdict: "先挂上，等补体验", note: "入口明确，可调用 GPT 5.5 / 5.4，倍率和计费规则待补。", advantage: "模型接入口径已明确，适合继续补价格和高峰样本。", risk: "缺少具体倍率与长期稳定性数据。", groupName: "", sortOrder: 5 },
    { name: "Datopology", badge: "未实测", url: "https://api.dstopology.com/keys", price: "待补录", multiplier: "待补录", entry: "Keys 页面", packageType: "模型接入已确认 / 价格待补", status: "可调用 GPT 5.5 / 5.4", models: "可调用 GPT 5.5 / 5.4", verdict: "先挂名，等第一手体验", note: "可调用 GPT 5.5 / 5.4，价格倍率待补。", advantage: "模型接入口径已明确，后续重点补价格、倍率和稳定性样本。", risk: "价格与稳定性仍缺第一手数据，别写成确定推荐。", groupName: "", sortOrder: 6 },
    { name: "WayX", badge: "待补测", url: "https://api.aiwxin.com/dashboard", price: "待补录", multiplier: "待补录", entry: "Dashboard 直链", packageType: "模型接入已确认 / 价格待补", status: "可调用 GPT 5.5 / 5.4", models: "可调用 GPT 5.5 / 5.4", verdict: "先收录，待继续反馈", note: "已收录入口，可调用 GPT 5.5 / 5.4。", advantage: "模型接入口径已明确，方便后续继续补价格和稳定性。", risk: "没有明确价格和高峰期稳定性数据。", groupName: "", sortOrder: 7 },
    { name: "ai8.my", badge: "低倍率", url: "https://ai8.my", price: "0.06 倍率", multiplier: "0.06x", entry: "域名入口", packageType: "倍率制", status: "低倍率，模型已确认", models: "可调用 GPT 5.5 / 5.4", verdict: "倍率比较亮眼", note: "倍率低，可调用 GPT 5.5 / 5.4，缺稳定性反馈。", advantage: "模型和倍率都有亮点，适合补进低倍率观察区。", risk: "高峰期稳定性仍缺样本，别只因为价格低就直接推荐。", groupName: "", sortOrder: 8 },
    { name: "Liary", badge: "卡制", url: "https://ai.liaryai.com/", price: "待补录", multiplier: "待补录", entry: "官网入口", packageType: "卡制 / 价格待补", status: "可调用 GPT 5.5 / 5.4", models: "可调用 GPT 5.5 / 5.4", verdict: "先保留入口", note: "可调用 GPT 5.5 / 5.4。", advantage: "模型接入口径已明确，后续补价格后可以继续横向比较。", risk: "价格和计费方式仍缺统一样本。", groupName: "", sortOrder: 9 },
    { name: "dazes.cc", badge: "注册送额", url: "https://cn.dazes.cc", price: "注册送额可试", multiplier: "待补录", entry: "官网登录", packageType: "注册送额 / 价格待补", status: "新人友好，模型已确认", models: "可调用 GPT 5.5 / 5.4", verdict: "新人友好", note: "注册送额，可调用 GPT 5.5 / 5.4，邀请码备注 dGSL。", advantage: "门槛低，模型接入口径明确，适合拿来先试。", risk: "「稳定」目前更多是社区口径，缺少统一实测。", groupName: "", sortOrder: 10 },
    { name: "viptoken站", badge: "低倍率", url: "https://www.viptoken.top/dashboard", price: "GPT 0.2 / Claude 0.15", multiplier: "0.15x 起", entry: "Dashboard 直链", packageType: "模型分组计价", status: "已拆 GPT / Claude", models: "GPT-5.5 / GPT-5.4 / Claude", verdict: "也需要按模型分开看", note: "GPT 5.5 / 5.4 与 Claude 组倍率不同。", advantage: "模型和价格分组清楚，适合放进正式榜单做对比。", risk: "仍缺高峰稳定性和长期使用反馈。", groupName: "", sortOrder: 11 },
    { name: "Primdream", badge: "待复核", url: "https://primdream.store/login", price: "待补录", multiplier: "待补录", entry: "官网登录", packageType: "模型接入已确认 / 价格待补", status: "可调用 GPT 5.5 / 5.4", models: "可调用 GPT 5.5 / 5.4", verdict: "等待新口径", note: "入口保留，可调用 GPT 5.5 / 5.4，倍率待补。", advantage: "模型接入口径已明确，后续更新价格比较方便。", risk: "价格和稳定性还没有足够样本做明确判断。", groupName: "", sortOrder: 12 },
    { name: "xiaoya-api", badge: "待补测", url: "https://xiaoya-api.xyz", price: "待补录", multiplier: "待补录", entry: "官网入口", packageType: "模型接入已确认 / 价格待补", status: "可调用 GPT 5.5 / 5.4", models: "可调用 GPT 5.5 / 5.4", verdict: "先收录，等新口径", note: "入口保留，可调用 GPT 5.5 / 5.4，倍率待补。", advantage: "模型接入口径已明确，后续补价格方便。", risk: "当前没有可直接比较的价格信息。", groupName: "", sortOrder: 13 },
    { name: "星见雅公益", badge: "免费", url: "https://new.xinjianya.top/", price: "免费", multiplier: "不适用", entry: "官网入口", packageType: "公益 / 免费入口", status: "免费入口 + Grok", models: "Grok / 其他待补", verdict: "适合单独关注", note: "免费入口，可调用 Grok。", advantage: "对新手非常友好，门槛最低，也有额外模型可试。", risk: "免费不代表长期稳定，仍要看规则和高峰表现。", groupName: "", sortOrder: 14 },
  ];

  const supabase = getSupabaseClient();
  // Get existing names
  const { data: existing } = await supabase.from("stations").select("name");
  const existingNames = new Set(((existing ?? []) as { name: string }[]).map((r) => r.name));

  let added = 0;
  for (const s of defaults) {
    if (existingNames.has(s.name)) continue;
    // Map to snake_case column names
    const { error } = await supabase.from("stations").insert({
      name: (s as any).name, badge: (s as any).badge, url: (s as any).url,
      price: (s as any).price, multiplier: (s as any).multiplier,
      entry: (s as any).entry, package_type: (s as any).packageType ?? (s as any).package_type ?? "",
      status: (s as any).status, models: (s as any).models,
      verdict: (s as any).verdict, note: (s as any).note,
      advantage: (s as any).advantage, risk: (s as any).risk,
      group_name: (s as any).groupName ?? (s as any).group_name ?? "",
      sort_order: (s as any).sortOrder ?? (s as any).sort_order ?? 0,
    });
    if (error) { console.error("[seed] Insert failed for", (s as any).name, error); }
    else added++;
  }
  notifyStationsChanged();
  return added;
}

/** Get a single station by id. */
export async function getStation(id: string): Promise<Station | null> {
  if (!isSupabaseConfigured()) return null;
  if (!isOfficialStationId(id)) return null;
  try {
    const { data, error } = await getSupabaseClient()
      .from("stations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data ? stationFromRow(data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Create a new station. The authenticated user becomes the author;
 *  sort_order is auto-assigned as max(sort_order) + 1. */
export async function createStation(input: {
  name: string;
  url?: string;
  price?: string;
  multiplier?: string;
  entry?: string;
  packageType?: string;
  status?: string;
  models?: string;
  uptime?: string;
  latency?: string;
  source?: string;
  verdict?: string;
  note?: string;
  advantage?: string;
  risk?: string;
  badge?: string;
  groupName?: string;
  sortOrder?: number;
}): Promise<Station> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置，无法创建站点。请先配置 Supabase 环境变量。");
  }
  const supabase = getSupabaseClient();

  try {
    const normalizedUrl = normalizeStationUrl(input.url);

    // Compute next sort_order
    const { data: maxRow, error: maxError } = await supabase
      .from("stations")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) throw maxError;

    const nextSortOrder =
      maxRow && typeof maxRow.sort_order === "number"
        ? maxRow.sort_order + 1
        : 1;

    const row = {
      name: input.name,
      url: normalizedUrl || null,
      price: input.price ?? null,
      multiplier: input.multiplier ?? null,
      entry: input.entry ?? null,
      package_type: input.packageType ?? null,
      status: input.status ?? null,
      models: input.models ?? null,
      uptime: input.uptime ?? null,
      latency: input.latency ?? null,
      source: input.source ?? null,
      verdict: input.verdict ?? null,
      note: input.note ?? null,
      advantage: input.advantage ?? null,
      risk: input.risk ?? null,
      badge: input.badge ?? null,
      group_name: input.groupName ?? null,
      sort_order: input.sortOrder ?? nextSortOrder,
    };

    const { data, error } = await supabase
      .from("stations")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      if (isPermissionError(error)) {
        throw new Error(stationWritePermissionMessage("新增"));
      }
      throw error;
    }
    return stationFromRow(data as Record<string, unknown>);
  } catch (e) {
    throw e instanceof Error ? e : new Error("创建站点失败，请稍后重试。");
  }
}

/**
 * Update a station in the official board and record the field-level history.
 */
export async function updateStation(
  id: string,
  updates: Partial<Station>,
  editorName: string,
): Promise<{ needsReview: boolean }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置，无法更新站点。请先配置 Supabase 环境变量。");
  }
  const supabase = getSupabaseClient();

  try {
    if (!isOfficialStationId(id)) {
      if (isTemporaryStationId(id)) {
        throw new Error("这条站点还是本地兜底数据（static-前缀），请用「保存为正式站点」按钮提交。");
      }
      throw new Error("站点ID格式不正确，无法更新。");
    }

    const normalizedUpdates = sanitizeStationUpdates(updates);
    if (normalizedUpdates.url !== undefined) {
      normalizedUpdates.url = normalizeStationUrl(normalizedUpdates.url);
    }

    // Fetch current row
    const { data: current, error: fetchError } = await supabase
      .from("stations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("[updateStation] Fetch error:", fetchError);
      throw new Error(`获取站点信息失败: ${fetchError.message}`);
    }

    const currentRow = current as Record<string, unknown>;

    // Get editor id
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error("请先登录后再修改站点。");
    }
    const editorId = userData.user.id;

    // Build edit records for each changed field
    const editInserts: Array<{
      station_id: string;
      editor_id: string;
      editor_name: string;
      field_name: string;
      old_value: string;
      new_value: string;
    }> = [];

    for (const [camelKey, newVal] of Object.entries(normalizedUpdates)) {
      if (camelKey === "id") continue;

      const snakeKey = toSnakeCase(camelKey);
      assertEditableStationField(snakeKey);
      const oldVal = currentRow[snakeKey];

      const oldStr = oldVal === null || oldVal === undefined ? "" : String(oldVal);
      const newStr = newVal === null || newVal === undefined ? "" : String(newVal);

      if (oldStr !== newStr) {
        editInserts.push({
          station_id: id,
          editor_id: editorId,
          editor_name: editorName,
          field_name: snakeKey,
          old_value: oldStr,
          new_value: newStr,
        });
      }
    }

    if (editInserts.length === 0) {
      return { needsReview: false }; // No changes
    }

    const updateRow = stationToUpdate(normalizedUpdates);
    if (Object.keys(updateRow).length > 0) {
      const { error: updateError } = await supabase
        .from("stations")
        .update(updateRow)
        .eq("id", id);

      if (updateError) {
        console.error("[updateStation] Update error:", updateError);
        if (isPermissionError(updateError)) {
          throw new Error(stationWritePermissionMessage("修改"));
        }
        throw new Error(`更新站点失败: ${updateError.message}`);
      }
    }

    const { error: editError } = await supabase
      .from("station_edits")
      .insert(editInserts);

    if (editError) {
      console.error("[updateStation] Edit insert error:", editError);
    }

    return { needsReview: false };
  } catch (e) {
    console.error("[updateStation] Exception:", e);
    throw e instanceof Error ? e : new Error("更新站点失败，请稍后重试。");
  }
}

/**
 * Load pending edits for admin review.
 */
export async function loadPendingEdits(): Promise<Array<{
  id: string;
  stationId: string;
  stationName: string;
  editorName: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}>> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await getSupabaseClient()
      .from("station_pending_edits")
      .select(`
        id, station_id, editor_name, field_name, old_value, new_value, created_at,
        stations(name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data ?? []).map((row: Record<string, unknown>) => {
      const station = row.stations as { name?: string } | null;
      return {
        id: row.id as string,
        stationId: row.station_id as string,
        stationName: station?.name ?? "未知站点",
        editorName: row.editor_name as string,
        fieldName: row.field_name as string,
        oldValue: row.old_value as string,
        newValue: row.new_value as string,
        createdAt: row.created_at as string,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Approve a pending edit - apply it to the station.
 */
export async function approvePendingEdit(editId: string): Promise<void> {
  const supabase = getSupabaseClient();

  // Get the pending edit
  const { data: edit, error: fetchError } = await supabase
    .from("station_pending_edits")
    .select("*")
    .eq("id", editId)
    .single();

  if (fetchError || !edit) {
    throw new Error("找不到待审核的编辑记录。");
  }

  const editRow = edit as Record<string, unknown>;

  // Apply the update to the station
  const fieldName = editRow.field_name as string;
  assertEditableStationField(fieldName);
  const newValue = editRow.new_value as string;
  const stationId = editRow.station_id as string;

  const { error: updateError } = await supabase
    .from("stations")
    .update({ [fieldName]: newValue })
    .eq("id", stationId);

  if (updateError) {
    throw new Error(`应用编辑失败: ${updateError.message}`);
  }

  // Record in station_edits
  await supabase.from("station_edits").insert({
    station_id: stationId,
    editor_id: editRow.editor_id,
    editor_name: editRow.editor_name,
    field_name: fieldName,
    old_value: editRow.old_value,
    new_value: newValue,
  });

  // Update pending edit status
  const { data: userData } = await supabase.auth.getUser();
  await supabase
    .from("station_pending_edits")
    .update({
      status: "approved",
      reviewed_by: userData?.user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", editId);
}

/**
 * Reject a pending edit.
 */
export async function rejectPendingEdit(editId: string, note: string = ""): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  await supabase
    .from("station_pending_edits")
    .update({
      status: "rejected",
      admin_note: note,
      reviewed_by: userData?.user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", editId);
}

/** Delete a station by id. */
export async function deleteStation(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置，无法删除站点。请先配置 Supabase 环境变量。");
  }
  if (!isOfficialStationId(id)) {
    throw new Error("这条站点还没有进入正式榜单，不能按正式站点删除。");
  }
  try {
    const { error } = await getSupabaseClient()
      .from("stations")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (e) {
    throw e instanceof Error ? e : new Error("删除站点失败，请稍后重试。");
  }
}

/** Load the edit history for a single station. */
export async function loadStationEditHistory(
  stationId: string,
): Promise<StationEditRecord[]> {
  if (!isSupabaseConfigured()) return [];
  if (!isOfficialStationId(stationId)) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("station_edits")
      .select("*")
      .eq("station_id", stationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(editRecordFromRow);
  } catch {
    return [];
  }
}

export async function submitStationEditRequest(params: {
  stationId: string;
  userId: string;
  suggestedData: StationEditRequestPayload;
}): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置，无法提交修改申请。");
  }
  if (!isOfficialStationId(params.stationId)) {
    throw new Error("这条站点还没有进入正式榜单，暂时不能提交修改申请。");
  }

  const { error } = await getSupabaseClient()
    .from("station_edit_requests")
    .insert({
      station_id: params.stationId,
      user_id: params.userId,
      suggested_data: params.suggestedData,
    });

  if (error) {
    throw new Error(`提交修改申请失败: ${error.message}`);
  }
}

/** Load the most recent edits across all stations (limit 50). */
export async function loadRecentEdits(): Promise<StationEditRecord[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("station_edits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(editRecordFromRow);
  } catch {
    return [];
  }
}
