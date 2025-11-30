'use client'

import { useState } from 'react'

export default function TestLoginPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const createTestUser = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/create-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: 'test',
          password: '1234',
          name: '테스트 사용자',
          role: 'admin'
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: 'test',
          password: '1234'
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">테스트 로그인 설정</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">1. 테스트 사용자 생성</h2>
          <button
            onClick={createTestUser}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '처리 중...' : '테스트 사용자 생성'}
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">2. 로그인 테스트</h2>
          <div className="mb-4">
            <p><strong>사번:</strong> test</p>
            <p><strong>비밀번호:</strong> 1234</p>
          </div>
          <button
            onClick={testLogin}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '처리 중...' : '로그인 테스트'}
          </button>
        </div>

        {result && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">결과</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-blue-50 p-6 rounded-lg mt-6">
          <h3 className="text-lg font-semibold mb-2">사용 방법</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>먼저 테스트 사용자 생성 버튼을 클릭하세요</li>
            <li>성공하면 로그인 테스트 버튼을 클릭하세요</li>
            <li>모든 것이 정상이면 <a href="/login" className="text-blue-600 underline">/login</a> 페이지에서 test/1234로 로그인할 수 있습니다</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
