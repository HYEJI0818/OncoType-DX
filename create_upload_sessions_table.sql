-- Upload sessions 테이블 생성
CREATE TABLE IF NOT EXISTS public.upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  patient_name TEXT,
  file_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  status TEXT DEFAULT 'uploaded',
  storage_type TEXT DEFAULT 'supabase',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upload files 테이블 생성 (세션에 속한 파일들)
CREATE TABLE IF NOT EXISTS public.upload_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES public.upload_sessions(session_id) ON DELETE CASCADE,
  sequence_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  saved_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_files ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽고 쓸 수 있도록 (테스트용)
CREATE POLICY "Allow all access to upload_sessions"
  ON public.upload_sessions FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to upload_files"
  ON public.upload_files FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_upload_sessions_session_id ON public.upload_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_upload_files_session_id ON public.upload_files(session_id);

