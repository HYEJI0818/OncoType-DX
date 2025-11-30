import { supabase, supabaseAdmin } from './supabase'

// 타입 정의
export interface Patient {
  id: number
  name: string
  gender?: string
  age?: number
  diagnosis?: string
  description?: string
  department?: string
  chart_number?: string
  exam_date?: string
  created_at: string
  updated_at: string
}

export interface PatientFile {
  id: number
  patient_id: number
  file_name: string
  file_path: string
  file_size?: number
  file_type?: string
  uploaded_at: string
}

export interface User {
  id: string
  email: string
  name?: string
  role: string
  created_at: string
  updated_at: string
}

// 연결 상태 확인
export async function checkSupabaseConnection(): Promise<{
  connected: boolean
  error?: string
}> {
  try {
    const { error } = await supabase.auth.getSession()
    if (error) throw error
    
    // 간단한 쿼리로 DB 연결 확인
    const { error: dbError } = await supabase
      .from('patients')
      .select('id')
      .limit(1)
    
    if (dbError) throw dbError
    
    return { connected: true }
  } catch (error: any) {
    return { 
      connected: false, 
      error: error.message || '연결 실패' 
    }
  }
}

// 환자 관리 함수들
export class PatientService {
  // 모든 환자 조회
  static async getAllPatients(): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  // 환자 ID로 조회
  static async getPatientById(id: number): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  // 새 환자 생성
  static async createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .insert([patient])
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // 환자 정보 업데이트
  static async updatePatient(id: number, updates: Partial<Patient>): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // 환자 삭제
  static async deletePatient(id: number): Promise<void> {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// 파일 관리 함수들
export class FileService {
  // 환자의 파일 목록 조회
  static async getPatientFiles(patientId: number): Promise<PatientFile[]> {
    const { data, error } = await supabase
      .from('patient_files')
      .select('*')
      .eq('patient_id', patientId)
      .order('uploaded_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  // 파일 메타데이터 저장
  static async saveFileMetadata(fileData: Omit<PatientFile, 'id' | 'uploaded_at'>): Promise<PatientFile> {
    const { data, error } = await supabase
      .from('patient_files')
      .insert([fileData])
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Storage에 파일 업로드
  static async uploadFile(
    file: File, 
    path: string,
    options?: { upsert?: boolean }
  ): Promise<{ path: string; fullPath: string }> {
    const client = supabaseAdmin || supabase
    
    const { data, error } = await client.storage
      .from('mri-files')
      .upload(path, file, {
        upsert: options?.upsert || false,
        contentType: file.type
      })
    
    if (error) throw error
    
    return {
      path: data.path,
      fullPath: `mri-files/${data.path}`
    }
  }

  // Storage에서 파일 다운로드 URL 생성
  static async getFileUrl(path: string): Promise<string> {
    const client = supabaseAdmin || supabase
    
    const { data } = client.storage
      .from('mri-files')
      .getPublicUrl(path)
    
    return data.publicUrl
  }

  // Storage에서 파일 삭제
  static async deleteFile(path: string): Promise<void> {
    const client = supabaseAdmin || supabase
    
    const { error } = await client.storage
      .from('mri-files')
      .remove([path])
    
    if (error) throw error
  }

  // 파일 메타데이터 삭제
  static async deleteFileMetadata(id: number): Promise<void> {
    const { error } = await supabase
      .from('patient_files')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// 사용자 관리 함수들
export class UserService {
  // 모든 사용자 조회
  static async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  // 사용자 생성 (회원가입 시)
  static async createUser(userData: Omit<User, 'created_at' | 'updated_at'>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // 사용자 정보 업데이트
  static async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Storage 관리 함수들
export class StorageService {
  // 버킷 목록 조회
  static async listBuckets() {
    const client = supabaseAdmin || supabase
    const { data, error } = await client.storage.listBuckets()
    
    if (error) throw error
    return data
  }

  // 특정 폴더의 파일 목록 조회
  static async listFiles(path: string = '') {
    const client = supabaseAdmin || supabase
    const { data, error } = await client.storage
      .from('mri-files')
      .list(path)
    
    if (error) throw error
    return data
  }

  // Storage 사용량 확인
  static async getStorageUsage() {
    try {
      const buckets = await this.listBuckets()
      const files = await this.listFiles()
      
      const totalSize = files?.reduce((sum, file) => {
        return sum + (file.metadata?.size || 0)
      }, 0) || 0
      
      return {
        buckets: buckets?.length || 0,
        files: files?.length || 0,
        totalSize: totalSize,
        formattedSize: this.formatBytes(totalSize)
      }
    } catch (error) {
      console.error('Storage 사용량 조회 실패:', error)
      return null
    }
  }

  // 바이트를 읽기 쉬운 형태로 변환
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// 실시간 구독 함수들
export class RealtimeService {
  // 환자 테이블 변경사항 구독
  static subscribeToPatients(callback: (payload: any) => void) {
    return supabase
      .channel('patients-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'patients' }, 
        callback
      )
      .subscribe()
  }

  // 파일 테이블 변경사항 구독
  static subscribeToFiles(callback: (payload: any) => void) {
    return supabase
      .channel('files-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'patient_files' }, 
        callback
      )
      .subscribe()
  }

  // 구독 해제
  static unsubscribe(subscription: any) {
    return supabase.removeChannel(subscription)
  }
}

// 헬스체크 함수
export async function performHealthCheck() {
  const results = {
    database: false,
    storage: false,
    auth: false,
    timestamp: new Date().toISOString()
  }

  try {
    // 데이터베이스 연결 확인
    const { error: dbError } = await supabase
      .from('patients')
      .select('id')
      .limit(1)
    results.database = !dbError

    // Storage 연결 확인
    const { error: storageError } = await (supabaseAdmin || supabase).storage.listBuckets()
    results.storage = !storageError

    // Auth 연결 확인
    const { error: authError } = await supabase.auth.getSession()
    results.auth = !authError

  } catch (error) {
    console.error('헬스체크 실패:', error)
  }

  return results
}

