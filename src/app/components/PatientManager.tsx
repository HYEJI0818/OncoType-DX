'use client'

import { useState, useEffect } from 'react'
import { PatientService, FileService, type Patient, type PatientFile } from '@/lib/supabase-utils'

interface PatientManagerProps {
  onPatientSelect?: (patient: Patient) => void
}

export default function PatientManager({ onPatientSelect }: PatientManagerProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientFiles, setPatientFiles] = useState<PatientFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPatient, setNewPatient] = useState({
    name: '',
    gender: '',
    age: '',
    diagnosis: '',
    description: '',
    department: '',
    chart_number: '',
    exam_date: ''
  })

  useEffect(() => {
    loadPatients()
  }, [])

  useEffect(() => {
    if (selectedPatient) {
      loadPatientFiles(selectedPatient.id)
    }
  }, [selectedPatient])

  const loadPatients = async () => {
    try {
      setLoading(true)
      const data = await PatientService.getAllPatients()
      setPatients(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || '환자 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadPatientFiles = async (patientId: number) => {
    try {
      const files = await FileService.getPatientFiles(patientId)
      setPatientFiles(files)
    } catch (err: any) {
      console.error('파일 목록 로드 실패:', err)
    }
  }

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const patientData = {
        ...newPatient,
        age: newPatient.age ? parseInt(newPatient.age) : undefined
      }
      
      const createdPatient = await PatientService.createPatient(patientData)
      setPatients([createdPatient, ...patients])
      setNewPatient({
        name: '',
        gender: '',
        age: '',
        diagnosis: '',
        description: '',
        department: '',
        chart_number: '',
        exam_date: ''
      })
      setShowCreateForm(false)
      setError(null)
    } catch (err: any) {
      setError(err.message || '환자 생성에 실패했습니다.')
    }
  }

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient)
    onPatientSelect?.(patient)
  }

  const handleDeletePatient = async (patientId: number) => {
    if (!confirm('정말로 이 환자 정보를 삭제하시겠습니까?')) return
    
    try {
      await PatientService.deletePatient(patientId)
      setPatients(patients.filter(p => p.id !== patientId))
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null)
        setPatientFiles([])
      }
      setError(null)
    } catch (err: any) {
      setError(err.message || '환자 삭제에 실패했습니다.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '알 수 없음'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">환자 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">환자 관리</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showCreateForm ? '취소' : '새 환자 추가'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">새 환자 추가</h3>
          <form onSubmit={handleCreatePatient} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">이름 *</label>
              <input
                type="text"
                required
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">성별</label>
              <select
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택하세요</option>
                <option value="남성">남성</option>
                <option value="여성">여성</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">나이</label>
              <input
                type="number"
                value={newPatient.age}
                onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">차트 번호</label>
              <input
                type="text"
                value={newPatient.chart_number}
                onChange={(e) => setNewPatient({ ...newPatient, chart_number: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">진료과</label>
              <input
                type="text"
                value={newPatient.department}
                onChange={(e) => setNewPatient({ ...newPatient, department: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">검사 날짜</label>
              <input
                type="date"
                value={newPatient.exam_date}
                onChange={(e) => setNewPatient({ ...newPatient, exam_date: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">진단</label>
              <input
                type="text"
                value={newPatient.diagnosis}
                onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">설명</label>
              <textarea
                value={newPatient.description}
                onChange={(e) => setNewPatient({ ...newPatient, description: e.target.value })}
                rows={3}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                환자 추가
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 환자 목록 */}
        <div>
          <h3 className="text-lg font-semibold mb-3">환자 목록 ({patients.length}명)</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                  selectedPatient?.id === patient.id ? 'bg-blue-50 border-blue-300' : ''
                }`}
                onClick={() => handlePatientSelect(patient)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-sm text-gray-600">
                      {patient.gender && `${patient.gender}, `}
                      {patient.age && `${patient.age}세, `}
                      {patient.department || '진료과 미지정'}
                    </div>
                    {patient.diagnosis && (
                      <div className="text-sm text-blue-600">{patient.diagnosis}</div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePatient(patient.id)
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
            {patients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 환자가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 선택된 환자 상세 정보 */}
        <div>
          {selectedPatient ? (
            <div>
              <h3 className="text-lg font-semibold mb-3">환자 상세 정보</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">이름:</span> {selectedPatient.name}</div>
                  <div><span className="font-medium">성별:</span> {selectedPatient.gender || '미지정'}</div>
                  <div><span className="font-medium">나이:</span> {selectedPatient.age || '미지정'}세</div>
                  <div><span className="font-medium">차트번호:</span> {selectedPatient.chart_number || '미지정'}</div>
                  <div><span className="font-medium">진료과:</span> {selectedPatient.department || '미지정'}</div>
                  <div><span className="font-medium">검사일:</span> {selectedPatient.exam_date ? formatDate(selectedPatient.exam_date) : '미지정'}</div>
                  <div className="col-span-2"><span className="font-medium">진단:</span> {selectedPatient.diagnosis || '미지정'}</div>
                  {selectedPatient.description && (
                    <div className="col-span-2"><span className="font-medium">설명:</span> {selectedPatient.description}</div>
                  )}
                </div>
              </div>

              <h4 className="font-semibold mb-2">파일 목록 ({patientFiles.length}개)</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {patientFiles.map((file) => (
                  <div key={file.id} className="p-2 bg-white border rounded text-sm">
                    <div className="font-medium">{file.file_name}</div>
                    <div className="text-gray-600">
                      {file.file_type} • {formatFileSize(file.file_size)} • {formatDate(file.uploaded_at)}
                    </div>
                  </div>
                ))}
                {patientFiles.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    업로드된 파일이 없습니다.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              환자를 선택하면 상세 정보가 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
