-- Supabase 테이블 정책 수정 SQL
-- patient_files 테이블의 RLS 정책을 더 관대하게 설정

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Authenticated users can access patient_files" ON patient_files;

-- 새로운 정책 생성 (더 관대한 권한)
CREATE POLICY "Anyone can access patient_files" ON patient_files
FOR ALL USING (true);

-- patients 테이블도 동일하게 수정
DROP POLICY IF EXISTS "Authenticated users can access patients" ON patients;

CREATE POLICY "Anyone can access patients" ON patients
FOR ALL USING (true);

-- users 테이블도 동일하게 수정
DROP POLICY IF EXISTS "Users can access their own data" ON users;

CREATE POLICY "Anyone can access users" ON users
FOR ALL USING (true);
