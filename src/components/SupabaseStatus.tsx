'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseStatus() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // 간단한 연결 테스트
        const { error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }
        
        setStatus('connected')
        setMessage('슈파베이스 연결이 정상입니다.')
      } catch (error) {
        console.error('Supabase 연결 오류:', error)
        setStatus('error')
        setMessage('슈파베이스 연결에 실패했습니다.')
      }
    }

    checkConnection()
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case 'loading': return 'text-yellow-600'
      case 'connected': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading': return '⏳'
      case 'connected': return '✅'
      case 'error': return '❌'
      default: return '❓'
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-2">슈파베이스 연결 상태</h3>
      <div className={`flex items-center gap-2 ${getStatusColor()}`}>
        <span className="text-xl">{getStatusIcon()}</span>
        <span>{message}</span>
      </div>
      {status === 'error' && (
        <p className="text-sm text-gray-600 mt-2">
          .env.local 파일에 올바른 슈파베이스 환경 변수가 설정되어 있는지 확인해주세요.
        </p>
      )}
    </div>
  )
} 