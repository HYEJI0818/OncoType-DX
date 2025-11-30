-- upload_sessions 테이블에 환자 상세 정보 컬럼 추가
ALTER TABLE public.upload_sessions
ADD COLUMN IF NOT EXISTS patient_gender TEXT,
ADD COLUMN IF NOT EXISTS patient_birth_date DATE,
ADD COLUMN IF NOT EXISTS patient_scan_date DATE,
ADD COLUMN IF NOT EXISTS patient_weight NUMERIC,
ADD COLUMN IF NOT EXISTS patient_height NUMERIC,
ADD COLUMN IF NOT EXISTS patient_medical_history TEXT,
ADD COLUMN IF NOT EXISTS patient_notes TEXT;

-- 코멘트 추가
COMMENT ON COLUMN public.upload_sessions.patient_gender IS '환자 성별';
COMMENT ON COLUMN public.upload_sessions.patient_birth_date IS '환자 생년월일';
COMMENT ON COLUMN public.upload_sessions.patient_scan_date IS '촬영 일자';
COMMENT ON COLUMN public.upload_sessions.patient_weight IS '환자 체중(kg)';
COMMENT ON COLUMN public.upload_sessions.patient_height IS '환자 키(cm)';
COMMENT ON COLUMN public.upload_sessions.patient_medical_history IS '과거 병력';
COMMENT ON COLUMN public.upload_sessions.patient_notes IS '참고 사항';

