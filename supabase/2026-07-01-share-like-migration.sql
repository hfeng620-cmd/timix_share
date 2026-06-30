-- Share 模块点赞 Junction Table 迁移（幂等版，已建表则跳过）
-- 在 Supabase SQL Editor 中执行

-- 1. share_post_likes
CREATE TABLE IF NOT EXISTS share_post_likes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID NOT NULL REFERENCES shared_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES forum_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 2. share_comment_likes
CREATE TABLE IF NOT EXISTS share_comment_likes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id  UUID NOT NULL REFERENCES share_post_comments(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES forum_profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- 3. RLS
ALTER TABLE share_post_likes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_comment_likes ENABLE ROW LEVEL SECURITY;

-- 4. SELECT
DO $$
BEGIN
  CREATE POLICY share_post_likes_select_all  ON share_post_likes  FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY share_comment_likes_select_all ON share_comment_likes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. INSERT
DO $$
BEGIN
  CREATE POLICY share_post_likes_insert_auth  ON share_post_likes  FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY share_comment_likes_insert_auth ON share_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. DELETE
DO $$
BEGIN
  CREATE POLICY share_post_likes_delete_own  ON share_post_likes  FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY share_comment_likes_delete_own ON share_comment_likes FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. 索引
CREATE INDEX IF NOT EXISTS idx_share_post_likes_post_id    ON share_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_share_comment_likes_comment_id ON share_comment_likes(comment_id);

-- 8. RPC: toggle_share_post_like
CREATE OR REPLACE FUNCTION toggle_share_post_like(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '请先登录'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM share_post_likes
    WHERE post_id = p_post_id AND user_id = v_user_id
  ) INTO v_existed;

  IF v_existed THEN
    DELETE FROM share_post_likes WHERE post_id = p_post_id AND user_id = v_user_id;
  ELSE
    INSERT INTO share_post_likes (post_id, user_id)
    VALUES (p_post_id, v_user_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'liked', NOT v_existed,
    'likes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'userId', spl.user_id,
        'displayName', fp.display_name,
        'avatarUrl', fp.avatar_url
      ) ORDER BY spl.created_at DESC)
      FROM share_post_likes spl
      JOIN forum_profiles fp ON fp.id = spl.user_id
      WHERE spl.post_id = p_post_id
    ), '[]'::jsonb)
  );
END;
$$;

-- 9. RPC: toggle_share_comment_like
CREATE OR REPLACE FUNCTION toggle_share_comment_like(p_comment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '请先登录'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM share_comment_likes
    WHERE comment_id = p_comment_id AND user_id = v_user_id
  ) INTO v_existed;

  IF v_existed THEN
    DELETE FROM share_comment_likes WHERE comment_id = p_comment_id AND user_id = v_user_id;
  ELSE
    INSERT INTO share_comment_likes (comment_id, user_id)
    VALUES (p_comment_id, v_user_id)
    ON CONFLICT (comment_id, user_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'liked', NOT v_existed,
    'likes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'userId', scl.user_id,
        'displayName', fp.display_name,
        'avatarUrl', fp.avatar_url
      ) ORDER BY scl.created_at DESC)
      FROM share_comment_likes scl
      JOIN forum_profiles fp ON fp.id = scl.user_id
      WHERE scl.comment_id = p_comment_id
    ), '[]'::jsonb)
  );
END;
$$;
