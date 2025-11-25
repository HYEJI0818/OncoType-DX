-- Supabase Storage 정책 수정 SQL
-- 기존 정책 삭제 후 새로운 정책 생성

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;

-- 새로운 정책 생성 (더 관대한 권한)
CREATE POLICY "Anyone can upload files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'mri-files');

CREATE POLICY "Anyone can view files" ON storage.objects
FOR SELECT USING (bucket_id = 'mri-files');

CREATE POLICY "Anyone can update files" ON storage.objects
FOR UPDATE USING (bucket_id = 'mri-files');

CREATE POLICY "Anyone can delete files" ON storage.objects
FOR DELETE USING (bucket_id = 'mri-files');

-- 버킷을 public으로 설정
UPDATE storage.buckets SET public = true WHERE id = 'mri-files';
