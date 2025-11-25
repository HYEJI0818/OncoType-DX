-- Supabase 데이터베이스 테이블 생성 SQL
-- 이 파일을 Supabase SQL Editor에서 실행하세요

-- 1. 환자 정보 테이블
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(10),
  age INTEGER,
  diagnosis TEXT,
  description TEXT,
  department VARCHAR(50),
  chart_number VARCHAR(50),
  exam_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 환자 파일 테이블 (MRI 이미지 등)
CREATE TABLE IF NOT EXISTS patient_files (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 사용자 테이블 (인증용 - Supabase Auth와 연동)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Storage 버킷 생성 (MRI 파일 저장용)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('mri-files', 'mri-files', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage 정책 설정 (인증된 사용자만 업로드/다운로드 가능)
CREATE POLICY "Authenticated users can upload files" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view files" ON storage.objects
FOR SELECT USING (auth.role() = 'authenticated');

-- 6. 테이블 권한 설정
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자만 접근 가능하도록 정책 설정
CREATE POLICY "Authenticated users can access patients" ON patients
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access patient_files" ON patient_files
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can access their own data" ON users
FOR ALL USING (auth.uid() = id);
