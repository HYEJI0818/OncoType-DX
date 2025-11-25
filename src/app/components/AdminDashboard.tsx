'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

interface Patient {
  id: number;
  examDate?: string;
  exam_date?: string;
  chartNumber?: string;
  chart_number?: string;
  labelNumber?: string;
  name: string;
  gender: string;
  age: number;
  birthDate?: string;
  birth_date?: string;
  diagnosis?: string;
  description?: string;
  department?: string;
  status?: 'normal' | 'urgent';
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  joinDate: string;
  lastSignIn: string;
}


export default function AdminDashboard() {
  const { logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState('Patient');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showCreatePatientModal, setShowCreatePatientModal] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedPatientDepartment, setSelectedPatientDepartment] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [showCTModal, setShowCTModal] = useState(false);
  const [selectedPatientForCT, setSelectedPatientForCT] = useState<Patient | null>(null);
  const [ctFiles, setCTFiles] = useState<FileList | null>(null);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editCTFiles, setEditCTFiles] = useState<FileList | null>(null);
  const [existingCTFiles, setExistingCTFiles] = useState<any[]>([]);
  const [loadingCTFiles, setLoadingCTFiles] = useState(false);

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (showCreateUserModal || showEditUserModal || showCreatePatientModal || showCTModal || showEditPatientModal) {
      const handleEscKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setShowCreateUserModal(false);
          setShowEditUserModal(false);
          setShowCreatePatientModal(false);
          setShowCTModal(false);
          setShowEditPatientModal(false);
          setEditingUser(null);
          setSelectedPatientForCT(null);
          setEditingPatient(null);
          setEditCTFiles(null);
          setExistingCTFiles([]);
          setLoadingCTFiles(false);
        }
      };
      
      document.addEventListener('keydown', handleEscKey);
      
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [showCreateUserModal, showEditUserModal, showCreatePatientModal, showCTModal, showEditPatientModal]);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: '사용자',
    employeeId: ''
  });
  const [accountType, setAccountType] = useState<'email' | 'employee'>('email');
  const [newPatient, setNewPatient] = useState({
    name: '',
    gender: '',
    birthDate: '',
    diagnosis: '',
    description: '',
    department: '',
    chartNumber: '',
    examDate: ''
  });
  const [selectedCTFiles, setSelectedCTFiles] = useState<FileList | null>(null);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString());
    loadPatients();
    loadUsers();
  }, []);

  // 환자 목록이 업데이트될 때마다 필터된 목록도 업데이트
  useEffect(() => {
    setFilteredPatients(patients);
  }, [patients]);

  const calculateBirthDateFromAge = (age: number) => {
    if (!age || age <= 0) return null;
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - age;
    return `${birthYear}-01-01`; // 대략적인 생년월일
  };

  const calculateAgeFromBirthDate = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const loadPatients = async () => {
    try {
      const response = await fetch('/api/users/patients');
      if (response.ok) {
        const data = await response.json();
        console.log('환자 데이터:', data); // 디버깅용
        
                        // 필드명 통일 (birth_date 컬럼이 없으므로 age로부터 계산)
        const normalizedData = data.map((patient: any) => ({
          ...patient,
          birthDate: patient.birth_date || calculateBirthDateFromAge(patient.age),
          chartNumber: patient.chart_number || patient.chartNumber,
          examDate: patient.exam_date || patient.examDate,
        }));
        
        setPatients(normalizedData);
      }
    } catch (error) {
      console.error('환자 데이터 로드 실패:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data); // 초기에는 모든 사용자 표시
      } else {
        console.error('사용자 데이터 로드 실패');
      }
    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    // 사번 전용 계정인 경우
    if (accountType === 'employee') {
      if (!newUser.employeeId || !newUser.password || !newUser.name) {
        alert('사번, 비밀번호, 이름을 입력해주세요.');
        return;
      }
      if (newUser.password.length < 4) {
        alert('사번 계정의 비밀번호는 최소 4자 이상이어야 합니다.');
        return;
      }
    } else {
      // 이메일 계정인 경우
      if (!newUser.email || !newUser.password) {
        alert('이메일과 비밀번호를 입력해주세요.');
        return;
      }
      if (newUser.password.length < 8) {
        alert('이메일 계정의 비밀번호는 최소 8자 이상이어야 합니다.');
        return;
      }
    }

    try {
      setLoading(true);
      const requestBody = accountType === 'employee' 
        ? {
            employeeId: newUser.employeeId,
            password: newUser.password,
            name: newUser.name,
            role: newUser.role,
            employeeOnly: true
          }
        : newUser;

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        alert('사용자가 성공적으로 생성되었습니다.');
        setShowCreateUserModal(false);
        setNewUser({ email: '', password: '', name: '', role: '사용자', employeeId: '' });
        setAccountType('email'); // 계정 타입 초기화
        loadUsers(); // 사용자 목록 새로고침
      } else {
        alert(data.error || '사용자 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 생성 오류:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };


  const handleSearch = () => {
    let filtered = users;

    // 검색어로 필터링
    if (searchTerm.trim()) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 부서로 필터링
    if (selectedDepartment) {
      filtered = filtered.filter(user => 
        user.role.toLowerCase() === selectedDepartment.toLowerCase()
      );
    }

    setFilteredUsers(filtered);
  };

  const handleResetSearch = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setFilteredUsers(users);
  };

  const handlePatientSearch = () => {
    let filtered = patients;

    // 검색어로 필터링
    if (patientSearchTerm.trim()) {
      filtered = filtered.filter(patient => 
        patient.name?.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
        patient.chartNumber?.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
        patient.diagnosis?.toLowerCase().includes(patientSearchTerm.toLowerCase())
      );
    }

    // 부서로 필터링
    if (selectedPatientDepartment) {
      filtered = filtered.filter(patient => 
        patient.department?.toLowerCase() === selectedPatientDepartment.toLowerCase()
      );
    }

    setFilteredPatients(filtered);
  };

  const handleResetPatientSearch = () => {
    setPatientSearchTerm('');
    setSelectedPatientDepartment('');
    setFilteredPatients(patients);
  };

  // 사용자 목록이 업데이트될 때마다 필터된 목록도 업데이트
  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditPassword('');
    setChangePassword(false);
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    // 비밀번호 변경 시 검증
    if (changePassword) {
      if (!editPassword) {
        alert('새 비밀번호를 입력해주세요.');
        return;
      }
      if (editPassword.length < 4) {
        alert('비밀번호는 최소 4자 이상이어야 합니다.');
        return;
      }
    }

    try {
      setLoading(true);
      const updateData: any = {
        name: editingUser.name,
        role: editingUser.role,
        email: editingUser.email
      };

      // 비밀번호 변경이 체크된 경우에만 비밀번호 포함
      if (changePassword && editPassword) {
        updateData.password = editPassword;
      }

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('사용자 정보가 성공적으로 수정되었습니다.');
        setShowEditUserModal(false);
        setEditingUser(null);
        setEditPassword('');
        setChangePassword(false);
        loadUsers(); // 사용자 목록 새로고침
      } else {
        alert(data.error || '사용자 정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 수정 오류:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`정말로 "${userName}" 사용자를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert('사용자가 성공적으로 삭제되었습니다.');
        loadUsers(); // 사용자 목록 새로고침
      } else {
        alert(data.error || '사용자 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 삭제 오류:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleCreatePatient = async () => {
    if (!newPatient.name || !newPatient.gender || !newPatient.birthDate || !newPatient.chartNumber) {
      alert('이름, 성별, 생년월일, 등록번호는 필수 입력 항목입니다.');
      return;
    }

    const age = calculateAge(newPatient.birthDate);
    if (age === null || age < 0 || age > 150) {
      alert('올바른 생년월일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      // 1단계: 환자 정보 등록
      const patientResponse = await fetch('/api/users/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPatient.name,
          gender: newPatient.gender,
          age: newPatient.birthDate ? calculateAgeFromBirthDate(newPatient.birthDate) : age,
          diagnosis: newPatient.diagnosis || null,
          description: newPatient.description || null,
          department: newPatient.department || null,
          chart_number: newPatient.chartNumber || null,
          exam_date: newPatient.examDate || null,
        }),
      });

      const patientData = await patientResponse.json();

      if (!patientResponse.ok) {
        alert(patientData.error || '환자 등록에 실패했습니다.');
        return;
      }

      // 2단계: CT 파일 업로드 (파일이 선택된 경우)
      if (selectedCTFiles && selectedCTFiles.length > 0) {
        const formData = new FormData();
        Array.from(selectedCTFiles).forEach((file) => {
          formData.append('files', file);
        });

        const uploadResponse = await fetch(`/api/users/upload-ct/${patientData.patient.id}`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          console.error('CT 파일 업로드 실패');
          alert('환자는 등록되었지만 CT 파일 업로드에 실패했습니다.');
        }
      }

      alert('환자가 성공적으로 등록되었습니다.');
      setShowCreatePatientModal(false);
      setNewPatient({
        name: '',
        gender: '',
        birthDate: '',
        diagnosis: '',
        description: '',
        department: '',
        chartNumber: '',
        examDate: ''
      });
      setSelectedCTFiles(null);
      loadPatients(); // 환자 목록 새로고침
      
    } catch (error) {
      console.error('환자 등록 오류:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCTModal = async (patient: Patient) => {
    setSelectedPatientForCT(patient);
    setShowCTModal(true);
    await loadExistingCTFiles(patient.id);
  };

  const loadExistingCTFiles = async (patientId: number) => {
    try {
      setLoadingCTFiles(true);
      const response = await fetch(`/api/users/${patientId}/files`);
      
      if (response.ok) {
        const files = await response.json();
        setExistingCTFiles(files);
      } else {
        console.error('CT 파일 목록 로드 실패');
        setExistingCTFiles([]);
      }
    } catch (error) {
      console.error('CT 파일 목록 로드 오류:', error);
      setExistingCTFiles([]);
    } finally {
      setLoadingCTFiles(false);
    }
  };

  const handleCTUpload = async () => {
    if (!selectedPatientForCT || !ctFiles || ctFiles.length === 0) {
      alert('파일을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      Array.from(ctFiles).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/users/upload-ct/${selectedPatientForCT.id}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('CT 파일이 성공적으로 업로드되었습니다.');
        setCTFiles(null);
        // CT 파일 목록 새로고침
        await loadExistingCTFiles(selectedPatientForCT.id);
        // 필요시 환자 목록 새로고침
        loadPatients();
      } else {
        alert('CT 파일 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('CT 업로드 오류:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setShowEditPatientModal(true);
  };

  const handleUpdatePatient = async () => {
    if (!editingPatient) return;

    if (!editingPatient.name || !editingPatient.gender || !editingPatient.chartNumber) {
      alert('이름, 성별, 등록번호는 필수 입력 항목입니다.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/users/patients/${editingPatient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingPatient.name,
          gender: editingPatient.gender,
          age: editingPatient.birthDate ? calculateAgeFromBirthDate(editingPatient.birthDate) : editingPatient.age,
          diagnosis: editingPatient.diagnosis || null,
          description: editingPatient.description || null,
          department: editingPatient.department || null,
          chart_number: editingPatient.chartNumber || editingPatient.chart_number,
          exam_date: editingPatient.examDate || editingPatient.exam_date || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // CT 파일 업로드 (파일이 선택된 경우)
        if (editCTFiles && editCTFiles.length > 0) {
          const formData = new FormData();
          Array.from(editCTFiles).forEach((file) => {
            formData.append('files', file);
          });

          const uploadResponse = await fetch(`/api/users/upload-ct/${editingPatient.id}`, {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            console.error('CT 파일 업로드 실패');
            alert('환자 정보는 수정되었지만 CT 파일 업로드에 실패했습니다.');
          }
        }

        // 생년월일이 변경된 경우 로컬 상태의 나이도 업데이트
        if (editingPatient.birthDate) {
          const newAge = calculateAgeFromBirthDate(editingPatient.birthDate);
          setEditingPatient(prev => prev ? { ...prev, age: newAge || 0 } : null);
        }

        alert('환자 정보가 성공적으로 수정되었습니다.');
        setShowEditPatientModal(false);
        setEditingPatient(null);
        setEditCTFiles(null);
        loadPatients(); // 환자 목록 새로고침
      } else {
        alert(data.error || '환자 정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('환자 수정 오류:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeletePatient = async (patientId: number, patientName: string) => {
    if (!confirm(`정말로 "${patientName}" 환자를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/users/patients/${patientId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert('환자가 성공적으로 삭제되었습니다.');
        loadPatients(); // 환자 목록 새로고침
      } else {
        alert(data.error || '환자 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('환자 삭제 오류:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      name: 'Patient',
      description: '모든 환자 정보를 조회하고 관리합니다'
    },
    {
      name: 'Account',
      description: '계정 생성/수정/삭제를 관리합니다'
    },
    {
      name: 'Setting',
      description: '시스템 설정 및 언어 변경'
    }
  ];

  const renderMainContent = () => {
    switch (activeMenu) {
      case 'Account':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white px-3 py-1 bg-gray-700 rounded-lg border border-gray-600">Account</h3>
                <div className="flex items-center gap-4">
                  {/* 작은 통계 카드들 */}
                  <div className="flex gap-3">
                    <div className="bg-blue-600 rounded-lg px-4 py-2 text-center min-w-[80px] h-10 flex flex-col justify-center">
                      <div className="text-sm font-bold text-white leading-none">{filteredUsers.length}</div>
                      <div className="text-blue-200 text-xs leading-none">{searchTerm || selectedDepartment ? '검색 결과' : '전체'}</div>
                    </div>
                    <div className="bg-green-600 rounded-lg px-4 py-2 text-center min-w-[80px] h-10 flex flex-col justify-center">
                      <div className="text-sm font-bold text-white leading-none">{filteredUsers.filter(u => u.status === '승인').length}</div>
                      <div className="text-green-200 text-xs leading-none">승인</div>
                    </div>
                    <div className="bg-yellow-600 rounded-lg px-4 py-2 text-center min-w-[80px] h-10 flex flex-col justify-center">
                      <div className="text-sm font-bold text-white leading-none">{filteredUsers.filter(u => u.status === '대기').length}</div>
                      <div className="text-yellow-200 text-xs leading-none">대기</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 검색 및 필터 */}
              <div className="mb-4 flex gap-4">
                <input
                  type="text"
                  placeholder="계정 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-center"
                />
                <select 
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">전체 부서</option>
                  <option value="관리자">관리자</option>
                  <option value="의사">의사</option>
                  <option value="간호사">간호사</option>
                  <option value="연구원">연구원</option>
                  <option value="사용자">사용자</option>
                </select>
                <button 
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  검색
                </button>
                <button 
                  onClick={() => setShowCreateUserModal(true)}
                  disabled={loading}
                  className="bg-white hover:bg-gray-100 disabled:bg-gray-300 text-black font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  계정 등록
                </button>
              </div>
              
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-600">
                      <tr>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">사용자</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">부서</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">상태</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">가입일</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                            로딩 중...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                            {users.length === 0 ? '등록된 사용자가 없습니다.' : '검색 결과가 없습니다.'}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-600">
                              <div className="text-center">
                                <div className="text-white font-medium">{user.name}</div>
                                <div className="text-gray-400 text-sm">{user.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-600">
                              <span className="text-gray-300">{user.role}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-600">
                              <span className={`px-3 py-2 text-sm rounded-full ${
                                (user.status === '승인' || user.status === '활성') ? 'bg-green-600 text-green-200' : 
                                user.status === '대기' ? 'bg-yellow-600 text-yellow-200' : 
                                'bg-red-600 text-red-200'
                              }`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-gray-300 text-sm border-r border-gray-600">
                              {user.joinDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                              <div className="flex justify-center space-x-2">
                                <button 
                                  onClick={() => handleEditUser(user)}
                                  disabled={loading}
                                  className="text-blue-400 hover:text-blue-300 disabled:text-gray-500"
                                >
                                  수정
                                </button>
                                <button 
                                  onClick={() => handleConfirmDeleteUser(user.id, user.name)}
                                  disabled={loading}
                                  className="text-red-400 hover:text-red-300 disabled:text-gray-500"
                                >
                                  삭제
                                </button>
                                {user.status === '대기' && (
                                  <button className="text-green-400 hover:text-green-300">승인</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'Patient':
        const totalPatients = filteredPatients.length;
        const tumorPatients = filteredPatients.filter(p => p.diagnosis && p.diagnosis.includes('종양')).length;
        const normalPatients = totalPatients - tumorPatients;

        return (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white px-3 py-1 bg-gray-700 rounded-lg border border-gray-600">Patient</h3>
                <div className="flex items-center gap-4">
                  {/* 작은 통계 카드들 */}
                  <div className="flex gap-3">
                    <div className="bg-blue-600 rounded-lg px-4 py-2 text-center min-w-[80px] h-10 flex flex-col justify-center">
                      <div className="text-sm font-bold text-white leading-none">{filteredPatients.length}</div>
                      <div className="text-blue-200 text-xs leading-none">{patientSearchTerm || selectedPatientDepartment ? '검색 결과' : '전체'}</div>
                    </div>
                    <div className="bg-red-600 rounded-lg px-4 py-2 text-center min-w-[80px] h-10 flex flex-col justify-center">
                      <div className="text-sm font-bold text-white leading-none">{tumorPatients}</div>
                      <div className="text-red-200 text-xs leading-none">종양</div>
                    </div>
                    <div className="bg-green-600 rounded-lg px-4 py-2 text-center min-w-[80px] h-10 flex flex-col justify-center">
                      <div className="text-sm font-bold text-white leading-none">{normalPatients}</div>
                      <div className="text-green-200 text-xs leading-none">정상</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 검색 및 필터 */}
              <div className="mb-4 flex gap-4">
                <input
                  type="text"
                  placeholder="환자 검색 (이름, 등록번호, 진단명)"
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handlePatientSearch();
                    }
                  }}
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-center"
                />
                <select 
                  value={selectedPatientDepartment}
                  onChange={(e) => setSelectedPatientDepartment(e.target.value)}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">전체 부서</option>
                  <option value="신경외과">신경외과</option>
                  <option value="신경과">신경과</option>
                  <option value="영상의학과">영상의학과</option>
                  <option value="내과">내과</option>
                  <option value="외과">외과</option>
                  <option value="기타">기타</option>
                </select>
                <button 
                  onClick={handlePatientSearch}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  검색
                </button>
                <button 
                  onClick={() => setShowCreatePatientModal(true)}
                  disabled={loading}
                  className="bg-white hover:bg-gray-100 disabled:bg-gray-300 text-black font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  신환 등록
                </button>
              </div>
              
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-600">
                      <tr>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">환자</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">생년월일</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">등록번호</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">부서</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">진단</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">DESCRIPTION</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">최종 내원일</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider border-r border-gray-500">CT 파일</th>
                        <th className="px-6 py-2 text-center text-base font-normal text-white uppercase tracking-wider">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-4 text-center text-gray-400">
                            로딩 중...
                          </td>
                        </tr>
                      ) : filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-4 text-center text-gray-400">
                            {patients.length === 0 ? '등록된 환자가 없습니다.' : '검색 결과가 없습니다.'}
                          </td>
                        </tr>
                      ) : (
                        filteredPatients.map((patient) => (
                          <tr key={patient.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-600">
                              <div className="text-center">
                                <div className="text-white font-medium">{patient.name || `P-${patient.id}`}</div>
                                <div className="text-gray-400 text-sm">{patient.age || 0}세, {patient.gender === 'M' ? '남성' : patient.gender === 'F' ? '여성' : '성별미상'}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-600">
                              <span className="text-gray-300">
                                {patient.birthDate ? patient.birthDate.split('T')[0] : (patient.age ? calculateBirthDateFromAge(patient.age) : '-')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-600">
                              <span className="text-gray-300">{patient.chartNumber || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-600">
                              <span className="text-gray-300">{patient.department || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-600">
                              <span className={`px-3 py-2 text-sm rounded-full ${
                                patient.diagnosis && patient.diagnosis.includes('종양') ? 'bg-red-600 text-red-200' : 
                                patient.diagnosis ? 'bg-green-600 text-green-200' : 
                                'bg-gray-600 text-gray-200'
                              }`}>
                                {patient.diagnosis || '진단 없음'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center border-r border-gray-600 text-gray-300 text-sm max-w-xs">
                              <div className="truncate" title={patient.description || '-'}>
                                {patient.description || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-600 text-gray-300 text-sm">
                              {patient.examDate || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-600 text-gray-300 text-sm">
                              <button 
                                onClick={() => handleOpenCTModal(patient)}
                                disabled={loading}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
                              >
                                Upload
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                              <div className="flex justify-center space-x-2">
                                <button 
                                  onClick={() => handleEditPatient(patient)}
                                  disabled={loading}
                                  className="text-blue-400 hover:text-blue-300 disabled:text-gray-500"
                                >
                                  수정
                                </button>
                                <button 
                                  onClick={() => handleConfirmDeletePatient(patient.id, patient.name || `P-${patient.id}`)}
                                  disabled={loading}
                                  className="text-red-400 hover:text-red-300 disabled:text-gray-500"
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'Setting':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-6 px-3 py-1 bg-gray-700 rounded-lg border border-gray-600 inline-block">Setting</h3>
              
              {/* 언어 설정 */}
              <div className="mb-8">
                <h4 className="text-lg font-medium text-white mb-4">언어 설정</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        기본 언어
                      </label>
                      <select className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none">
                        <option value="ko">한국어</option>
                        <option value="en">English</option>
                        <option value="ja">日本語</option>
                        <option value="zh">中文</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        의료 용어 언어
                      </label>
                      <select className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none">
                        <option value="ko">한국어</option>
                        <option value="en">English</option>
                        <option value="mixed">혼용</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-gray-300">사용자가 개별적으로 언어 설정 변경 허용</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 시스템 설정 */}
              <div className="mb-8">
                <h4 className="text-lg font-medium text-white mb-4">시스템 설정</h4>
                <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        세션 타임아웃 (분)
                      </label>
                      <input
                        type="number"
                        defaultValue="30"
                        className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        최대 파일 업로드 크기 (MB)
                      </label>
                      <input
                        type="number"
                        defaultValue="100"
                        className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-gray-300">자동 백업 활성화</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-gray-300">사용자 활동 로그 기록</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-gray-300">익명 사용 통계 수집</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* AI 모델 설정 */}
              <div className="mb-8">
                <h4 className="text-lg font-medium text-white mb-4">AI 모델 설정</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        진단 모델 버전
                      </label>
                      <select className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none">
                        <option value="v2.1">v2.1 (최신)</option>
                        <option value="v2.0">v2.0 (안정)</option>
                        <option value="v1.9">v1.9 (이전)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        신뢰도 임계값 (%)
                      </label>
                      <input
                        type="number"
                        defaultValue="85"
                        min="0"
                        max="100"
                        className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="bg-gray-600 rounded-lg p-3">
                    <div className="text-sm text-gray-300">
                      <strong>모델 상태:</strong> 정상 동작 중
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      마지막 업데이트: 2025-01-10 14:30:25
                    </div>
                  </div>
                </div>
              </div>

              {/* 보안 설정 */}
              <div className="mb-8">
                <h4 className="text-lg font-medium text-white mb-4">보안 설정</h4>
                <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        비밀번호 최소 길이
                      </label>
                      <input
                        type="number"
                        defaultValue="8"
                        min="6"
                        max="20"
                        className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        로그인 시도 제한
                      </label>
                      <input
                        type="number"
                        defaultValue="5"
                        min="3"
                        max="10"
                        className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-gray-300">2단계 인증 강제</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-gray-300">IP 주소 기반 접근 제한</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-gray-300">정기적 비밀번호 변경 요구</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 저장 버튼 */}
              <div className="flex justify-end space-x-4">
                <button className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-colors">
                  취소
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
                  설정 저장
                </button>
              </div>
            </div>
          </div>
        );
      
      default:
        return <div className="text-white">선택된 메뉴가 없습니다.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* 사이드바 */}
      <div className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 relative flex flex-col ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      }`}>
        {/* 헤더 */}
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <>
                <div className="flex items-center gap-3">
                  <Image
                    src="/silla-mark.png"
                    alt="SILLA SYSTEM"
                    width={32}
                    height={32}
                    className="w-8 h-8 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-white truncate">관리자(admin)</h1>
                    <p className="text-gray-400 truncate">관리자 페이지</p>
                  </div>
                </div>
                <button 
                  onClick={logout}
                  className="px-3 py-1 text-gray-300 bg-gray-700 hover:bg-gray-600 hover:text-white rounded-lg transition-colors text-sm border border-gray-600"
                  title="로그아웃"
                >
                  로그아웃
                </button>
              </>
            )}
            {sidebarCollapsed && (
              <div className="flex items-center justify-center w-full">
                <Image
                  src="/silla-mark.png"
                  alt="SILLA SYSTEM"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </div>
            )}
          </div>
        </div>

        {/* 사이드바 펼침/축소 버튼 - 세로 중앙 */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 w-8 h-8 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-full transition-colors flex items-center justify-center shadow-lg border border-gray-600 z-10"
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>

        {/* 메뉴 목록 */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveMenu(item.name)}
              className={`w-full text-left p-3 rounded-lg transition-colors border ${
                activeMenu === item.name
                  ? 'bg-blue-600 text-white border-gray-600'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white border-gray-600'
              }`}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-xs opacity-75 truncate">{item.description}</div>
                  </div>
                )}
                {sidebarCollapsed && (
                  <div className="font-medium text-sm">{item.name}</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 마지막 업데이트 정보 */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-700 flex-shrink-0">
            <div className="text-gray-400 text-xs text-center">
              마지막 업데이트: {currentTime || '로딩 중...'}
            </div>
          </div>
        )}

      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 p-4">
        {/* 메인 콘텐츠 */}
        {renderMainContent()}
      </div>

      {/* 새 사용자 생성 모달 */}
      {showCreateUserModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] animate-in zoom-in-95 duration-200">
          <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-2xl border border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <h3 className="text-xl font-semibold text-white">계정 생성</h3>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setAccountType('email');
                    setNewUser({ email: '', password: '', name: '', role: '사용자', employeeId: '' });
                  }}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 계정 타입 선택 탭 */}
            <div className="mb-6">
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('email');
                    setNewUser({ ...newUser, email: '', employeeId: '' });
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                    accountType === 'email'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  이메일 계정
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('employee');
                    setNewUser({ ...newUser, email: '', employeeId: '' });
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                    accountType === 'employee'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  사번 전용 계정
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {accountType === 'email' ? (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    이메일*
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="이메일을 입력하세요"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    사번*
                  </label>
                  <input
                    type="text"
                    value={newUser.employeeId}
                    onChange={(e) => setNewUser({ ...newUser, employeeId: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="사번을 입력하세요 (예: EMP001)"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  비밀번호 *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder={accountType === 'employee' ? '최소 4자 이상' : '최소 8자 이상'}
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  성함{accountType === 'employee' ? '*' : ''}
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="성함을 입력하세요"
                />
              </div>

              {accountType === 'email' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    사번 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={newUser.employeeId}
                    onChange={(e) => setNewUser({ ...newUser, employeeId: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="사번을 입력하세요 (사번 로그인용)"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  부서
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="사용자">사용자</option>
                  <option value="의사">의사</option>
                  <option value="간호사">간호사</option>
                  <option value="연구원">연구원</option>
                  <option value="관리자">관리자</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowCreateUserModal(false)}
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateUser}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? '생성 중...' : '계정 생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 수정 모달 */}
      {showEditUserModal && editingUser && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] animate-in zoom-in-95 duration-200">
          <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-2xl border border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <h3 className="text-xl font-semibold text-white">사용자 정보 수정</h3>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => {
                    setShowEditUserModal(false);
                    setEditingUser(null);
                    setEditPassword('');
                    setChangePassword(false);
                  }}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  이메일* or 사번*
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="user@example.com 또는 사번"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  성함
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="성함을 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  부서
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="사용자">사용자</option>
                  <option value="의사">의사</option>
                  <option value="간호사">간호사</option>
                  <option value="연구원">연구원</option>
                  <option value="관리자">관리자</option>
                </select>
              </div>

              {/* 비밀번호 변경 섹션 */}
              <div>
                <label className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    checked={changePassword}
                    onChange={(e) => setChangePassword(e.target.checked)}
                    className="mr-2 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-300 text-sm font-medium">비밀번호 변경</span>
                </label>
                
                {changePassword && (
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      새 비밀번호 *
                    </label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="최소 4자 이상"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setEditingUser(null);
                  setEditPassword('');
                  setChangePassword(false);
                }}
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? '수정 중...' : '정보 수정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 새 환자 등록 모달 */}
      {showCreatePatientModal && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] animate-in zoom-in-95 duration-200">
          <div className="bg-gray-800 rounded-lg p-8 w-[800px] max-w-[95vw] shadow-2xl border border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <div className="px-3 py-1 text-white bg-gray-700 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold">신환 등록</h3>
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => {
                    setShowCreatePatientModal(false);
                    setNewPatient({
                      name: '',
                      gender: '',
                      birthDate: '',
                      diagnosis: '',
                      description: '',
                      department: '',
                      chartNumber: '',
                      examDate: ''
                    });
                    setSelectedCTFiles(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* 첫 번째 행: 환자명, 성별, 생년월일 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    환자명*
                  </label>
                  <input
                    type="text"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="환자명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    성별*
                  </label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">선택</option>
                    <option value="M">남성</option>
                    <option value="F">여성</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    생년월일*
                  </label>
                  <input
                    type="date"
                    value={newPatient.birthDate}
                    onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 두 번째 행: 등록번호, 진료부서, 최초내원일 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    등록번호*
                  </label>
                  <input
                    type="text"
                    value={newPatient.chartNumber}
                    onChange={(e) => setNewPatient({ ...newPatient, chartNumber: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="등록번호를 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    진료 부서
                  </label>
                  <select
                    value={newPatient.department}
                    onChange={(e) => setNewPatient({ ...newPatient, department: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">선택</option>
                    <option value="신경외과">신경외과</option>
                    <option value="신경과">신경과</option>
                    <option value="영상의학과">영상의학과</option>
                    <option value="내과">내과</option>
                    <option value="외과">외과</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    최초 내원일
                  </label>
                  <input
                    type="date"
                    value={newPatient.examDate}
                    onChange={(e) => setNewPatient({ ...newPatient, examDate: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 세 번째 행: 진단명 */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  진단명
                </label>
                <input
                  type="text"
                  value={newPatient.diagnosis}
                  onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="진단명을 입력하세요"
                />
              </div>

              {/* 네 번째 행: CT 파일 업로드 */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  CT 파일 업로드
                </label>
                <div className="relative flex items-stretch">
                  <div className="flex-1 bg-gray-700 px-4 py-3 rounded-lg border border-gray-600 flex items-center">
                    <span className={selectedCTFiles && selectedCTFiles.length > 0 ? "text-white" : "text-gray-400"}>
                      {selectedCTFiles && selectedCTFiles.length > 0 
                        ? `${selectedCTFiles.length}개 파일 선택됨` 
                        : '파일을 선택하세요'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg cursor-pointer transition-colors text-sm font-medium flex items-center h-full">
                      Upload
                      <input
                        type="file"
                        multiple
                        accept=".nii,.nii.gz,.dcm,.dicom"
                        onChange={(e) => setSelectedCTFiles(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                {selectedCTFiles && selectedCTFiles.length > 0 && (
                  <div className="mt-2">
                    <div className="max-h-20 overflow-y-auto">
                      {Array.from(selectedCTFiles).map((file, index) => (
                        <div key={index} className="text-xs text-gray-500 truncate">
                          • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 다섯 번째 행: DESCRIPTION */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  DESCRIPTION
                </label>
                <textarea
                  value={newPatient.description}
                  onChange={(e) => setNewPatient({ ...newPatient, description: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  rows={4}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowCreatePatientModal(false);
                  setNewPatient({
                    name: '',
                    gender: '',
                    birthDate: '',
                    diagnosis: '',
                    description: '',
                    department: '',
                    chartNumber: '',
                    examDate: ''
                  });
                  setSelectedCTFiles(null);
                }}
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreatePatient}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CT 파일 관리 모달 */}
      {showCTModal && selectedPatientForCT && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] animate-in zoom-in-95 duration-200">
          <div className="bg-gray-800 rounded-lg p-6 w-[600px] max-w-[95vw] shadow-2xl border border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <h3 className="text-xl font-semibold text-white">CT 파일 관리</h3>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => {
                    setShowCTModal(false);
                    setSelectedPatientForCT(null);
                    setCTFiles(null);
                    setExistingCTFiles([]);
                    setLoadingCTFiles(false);
                  }}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 환자 정보 */}
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <div className="ml-4">
                  <div className="text-white font-medium text-lg">{selectedPatientForCT.name || `P-${selectedPatientForCT.id}`}</div>
                  <div className="text-gray-400">{selectedPatientForCT.age || 0}세, {selectedPatientForCT.gender === 'M' ? '남성' : selectedPatientForCT.gender === 'F' ? '여성' : '성별미상'}</div>
                </div>
              </div>
            </div>

            {/* 파일 업로드 섹션 */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-white mb-4">새 CT 파일 업로드</h4>
              <div className="space-y-4">
                <div className="relative flex items-stretch">
                  <div className="flex-1 bg-gray-700 px-4 py-3 rounded-lg border border-gray-600 flex items-center">
                    <span className={ctFiles && ctFiles.length > 0 ? "text-white" : "text-gray-400"}>
                      {ctFiles && ctFiles.length > 0 
                        ? `${ctFiles.length}개 파일 선택됨` 
                        : '파일을 선택하세요'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg cursor-pointer transition-colors text-sm font-medium flex items-center h-full">
                      파일 선택
                      <input
                        type="file"
                        multiple
                        accept=".nii,.nii.gz,.dcm,.dicom"
                        onChange={(e) => setCTFiles(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                {ctFiles && ctFiles.length > 0 && (
                  <div className="max-h-32 overflow-y-auto bg-gray-700 rounded-lg p-3">
                    {Array.from(ctFiles).map((file, index) => (
                      <div key={index} className="text-xs text-gray-300 py-1">
                        • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleCTUpload}
                  disabled={loading || !ctFiles || ctFiles.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  {loading ? '업로드 중...' : '파일 업로드'}
                </button>
              </div>
            </div>

            {/* 기존 파일 목록 섹션 */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-white mb-4">기존 CT 파일 목록</h4>
              <div className="bg-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
                {loadingCTFiles ? (
                  <div className="text-gray-400 text-sm text-center py-4">
                    파일 목록을 불러오는 중...
                  </div>
                ) : existingCTFiles.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-4">
                    업로드된 CT 파일이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {existingCTFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                        <div className="flex-1">
                          <div className="text-white text-sm font-medium truncate">
                            {file.original_filename || file.file_name || `파일 ${index + 1}`}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : ''} • 
                            {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : ''}
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = file.public_url;
                              link.download = file.original_filename || file.file_name || 'ct_file';
                              link.click();
                            }}
                            className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-600/20 rounded"
                          >
                            다운로드
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowCTModal(false);
                  setSelectedPatientForCT(null);
                  setCTFiles(null);
                  setExistingCTFiles([]);
                  setLoadingCTFiles(false);
                }}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 환자 정보 수정 모달 */}
      {showEditPatientModal && editingPatient && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] animate-in zoom-in-95 duration-200">
          <div className="bg-gray-800 rounded-lg p-8 w-[800px] max-w-[95vw] shadow-2xl border border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <div className="px-3 py-1 text-white bg-gray-700 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold">환자 정보 수정</h3>
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => {
                    setShowEditPatientModal(false);
                    setEditingPatient(null);
                    setEditCTFiles(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* 첫 번째 행: 환자명, 성별, 생년월일 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    환자명*
                  </label>
                  <input
                    type="text"
                    value={editingPatient.name}
                    onChange={(e) => setEditingPatient({ ...editingPatient, name: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="환자명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    성별*
                  </label>
                  <select
                    value={editingPatient.gender}
                    onChange={(e) => setEditingPatient({ ...editingPatient, gender: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">선택</option>
                    <option value="M">남성</option>
                    <option value="F">여성</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    생년월일
                  </label>
                  <input
                    type="date"
                    value={editingPatient.birthDate || editingPatient.birth_date || ''}
                    onChange={(e) => setEditingPatient({ ...editingPatient, birthDate: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 두 번째 행: 등록번호, 진료부서, 최초내원일 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    등록번호*
                  </label>
                  <input
                    type="text"
                    value={editingPatient.chartNumber}
                    onChange={(e) => setEditingPatient({ ...editingPatient, chartNumber: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="등록번호를 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    진료 부서
                  </label>
                  <select
                    value={editingPatient.department || ''}
                    onChange={(e) => setEditingPatient({ ...editingPatient, department: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">선택</option>
                    <option value="신경외과">신경외과</option>
                    <option value="신경과">신경과</option>
                    <option value="영상의학과">영상의학과</option>
                    <option value="내과">내과</option>
                    <option value="외과">외과</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    최초 내원일
                  </label>
                  <input
                    type="date"
                    value={editingPatient.examDate || ''}
                    onChange={(e) => setEditingPatient({ ...editingPatient, examDate: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 세 번째 행: 진단명 */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  진단명
                </label>
                <input
                  type="text"
                  value={editingPatient.diagnosis || ''}
                  onChange={(e) => setEditingPatient({ ...editingPatient, diagnosis: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="진단명을 입력하세요"
                />
              </div>

              {/* 네 번째 행: CT 파일 업로드 */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  CT 파일 업로드
                </label>
                <div className="relative flex items-stretch">
                  <div className="flex-1 bg-gray-700 px-4 py-3 rounded-lg border border-gray-600 flex items-center">
                    <span className={editCTFiles && editCTFiles.length > 0 ? "text-white" : "text-gray-400"}>
                      {editCTFiles && editCTFiles.length > 0 
                        ? `${editCTFiles.length}개 파일 선택됨` 
                        : '파일을 선택하세요'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg cursor-pointer transition-colors text-sm font-medium flex items-center h-full">
                      Upload
                      <input
                        type="file"
                        multiple
                        accept=".nii,.nii.gz,.dcm,.dicom"
                        onChange={(e) => setEditCTFiles(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                {editCTFiles && editCTFiles.length > 0 && (
                  <div className="mt-2">
                    <div className="max-h-20 overflow-y-auto">
                      {Array.from(editCTFiles).map((file, index) => (
                        <div key={index} className="text-xs text-gray-500 truncate">
                          • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 다섯 번째 행: DESCRIPTION */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  DESCRIPTION
                </label>
                <textarea
                  value={editingPatient.description || ''}
                  onChange={(e) => setEditingPatient({ ...editingPatient, description: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  rows={4}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowEditPatientModal(false);
                  setEditingPatient(null);
                  setEditCTFiles(null);
                }}
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdatePatient}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? '수정 중...' : '수정 완료'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
