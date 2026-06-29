-- ═══════════════════════════════════════════════════════
-- Supabase Storage: post_images 存储桶
-- 用途: Share 分享项目的帖子正文图片上传
-- 在 Supabase SQL Editor 中执行
-- ═══════════════════════════════════════════════════════

-- 1. 创建存储桶（通过 Supabase Dashboard > Storage 或 SQL）
--    如果 Supabase 版本不支持 SQL 创建 bucket，请在 Dashboard 中手动创建：
--    Storage → New Bucket → 名称: post_images → 勾选 "Public bucket"

-- 2. 允许 public 读取（所有人可查看图片）
CREATE POLICY "允许公开读取帖子图片"
ON storage.objects FOR SELECT
USING (bucket_id = 'post_images');

-- 3. 仅允许已登录用户上传图片
CREATE POLICY "允许登录用户上传帖子图片"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post_images'
  AND auth.role() = 'authenticated'
);

-- 4. 允许上传者删除自己的图片（可选）
CREATE POLICY "允许上传者删除自己的图片"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post_images'
  AND auth.uid() = owner
);
