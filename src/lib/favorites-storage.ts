import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

/**
 * Get all favorite station names for the current user
 */
export async function loadFavorites(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data: userData } = await getSupabaseClient().auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await getSupabaseClient()
      .from("station_favorites")
      .select("station_name")
      .eq("user_id", userData.user.id);

    if (error) return [];
    return (data ?? []).map((r: { station_name: string }) => r.station_name);
  } catch {
    return [];
  }
}

/**
 * Toggle favorite status for a station. Returns true if now favorited, false if removed.
 */
export async function toggleFavorite(stationName: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { data: userData } = await getSupabaseClient().auth.getUser();
  if (!userData.user) throw new Error("请先登录");

  const supabase = getSupabaseClient();

  // Check if already favorited
  const { data: existing } = await supabase
    .from("station_favorites")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("station_name", stationName)
    .maybeSingle();

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from("station_favorites")
      .delete()
      .eq("user_id", userData.user.id)
      .eq("station_name", stationName);
    if (error) throw error;
    return false;
  } else {
    // Add favorite
    const { error } = await supabase
      .from("station_favorites")
      .insert({ user_id: userData.user.id, station_name: stationName });
    if (error) throw error;
    return true;
  }
}

/**
 * Get favorite count for a station
 */
export async function getFavoriteCount(stationName: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const { data, error } = await getSupabaseClient()
      .from("station_favorite_counts")
      .select("favorite_count")
      .eq("station_name", stationName)
      .maybeSingle();

    if (error || !data) return 0;
    return (data as { favorite_count?: number }).favorite_count ?? 0;
  } catch {
    return 0;
  }
}
