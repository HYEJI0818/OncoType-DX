'use client'

import { useState, useEffect } from 'react'
import { performHealthCheck, StorageService } from '@/lib/supabase-utils'

interface HealthStatus {
  database: boolean
  storage: boolean
  auth: boolean
  timestamp: string
}

interface StorageInfo {
  buckets: number
  files: number
  totalSize: number
  formattedSize: string
}

export default function SupabaseStatus() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'partial' | 'error'>('loading')
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [message, setMessage] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    checkConnection()
    // 30초마다 상태 확인
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkConnection = async () => {
    try {
      const health = await performHealthCheck()
      const storage = await StorageService.getStorageUsage()
      
      setHealthStatus(health)
      setStorageInfo(storage)

      const connectedServices = [health.database, health.storage, health.auth].filter(Boolean).length
      
      if (connectedServices === 3) {
        setStatus('connected')
        setMessage('모든 Supabase 서비스가 정상 작동 중입니다.')
      } else if (connectedServices > 0) {
        setStatus('partial')
        setMessage(`${connectedServices}/3 서비스가 연결되었습니다.`)
      } else {
        setStatus('error')
        setMessage('Supabase 연결에 실패했습니다.')
      }
    } catch (error) {
      console.error('Supabase 상태 확인 오류:', error)
      setStatus('error')
      setMessage('상태 확인 중 오류가 발생했습니다.')
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading': return 'text-yellow-600'
      case 'connected': return 'text-green-600'
      case 'partial': return 'text-orange-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading': return '⏳'
      case 'connected': return '✅'
      case 'partial': return '⚠️'
      case 'error': return '❌'
      default: return '❓'
    }
  }

  const getBgColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-50 border-green-200'
      case 'partial': return 'bg-orange-50 border-orange-200'
      case 'error': return 'bg-red-50 border-red-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={`p-4 border rounded-lg shadow-sm ${getBgColor()}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Supabase 연결 상태</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showDetails ? '간단히 보기' : '자세히 보기'}
        </button>
      </div>
      
      <div className={`flex items-center gap-2 mt-2 ${getStatusColor()}`}>
        <span className="text-xl">{getStatusIcon()}</span>
        <span className="font-medium">{message}</span>
      </div>

      {healthStatus && (
        <div className="mt-2 text-sm text-gray-600">
          마지막 확인: {new Date(healthStatus.timestamp).toLocaleString('ko-KR')}
        </div>
      )}

      {showDetails && healthStatus && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-lg ${healthStatus.database ? 'text-green-600' : 'text-red-600'}`}>
                {healthStatus.database ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium">데이터베이스</div>
            </div>
            <div className="text-center">
              <div className={`text-lg ${healthStatus.storage ? 'text-green-600' : 'text-red-600'}`}>
                {healthStatus.storage ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium">스토리지</div>
            </div>
            <div className="text-center">
              <div className={`text-lg ${healthStatus.auth ? 'text-green-600' : 'text-red-600'}`}>
                {healthStatus.auth ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium">인증</div>
            </div>
          </div>

          {storageInfo && (
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium mb-2">스토리지 정보</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">버킷 수:</span>
                  <span className="ml-2 font-medium">{storageInfo.buckets}개</span>
                </div>
                <div>
                  <span className="text-gray-600">파일 수:</span>
                  <span className="ml-2 font-medium">{storageInfo.files}개</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">사용량:</span>
                  <span className="ml-2 font-medium">{storageInfo.formattedSize}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={checkConnection}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              다시 확인
            </button>
            <button
              onClick={() => window.open('/api/test-supabase', '_blank')}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              API 테스트
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded">
          <p className="text-sm text-red-800 font-medium">문제 해결 방법:</p>
          <ul className="text-sm text-red-700 mt-1 space-y-1">
            <li>• .env.local 파일의 환경 변수 확인</li>
            <li>• Supabase 프로젝트가 활성화되어 있는지 확인</li>
            <li>• API 키가 올바른지 확인</li>
            <li>• 네트워크 연결 상태 확인</li>
          </ul>
        </div>
      )}
    </div>
  )
} 