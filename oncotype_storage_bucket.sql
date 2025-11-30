-- Supabase Storage bucket 생성 (파일 업로드용)

-- oncotype-files bucket 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'oncotype-files',
  'oncotype-files',
  true,  -- public access
  524288000,  -- 500MB
  ARRAY['application/x-gzip', 'application/gzip', 'application/octet-stream', 'image/nii', 'image/nifti']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: 모든 사용자가 업로드 가능
CREATE POLICY "Allow public upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'oncotype-files');

-- Storage policy: 모든 사용자가 읽기 가능
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'oncotype-files');

-- Storage policy: 모든 사용자가 삭제 가능
CREATE POLICY "Allow public delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'oncotype-files');

-- Storage policy: 모든 사용자가 업데이트 가능
CREATE POLICY "Allow public update"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'oncotype-files');

