export type Language = 'ko' | 'en' | 'th' | 'zh';

export interface Translations {
  // Dashboard Header
  dashboardTitle: string;
  dashboardSubtitle: string;
  doctorId: string;
  patientCount: string;
  analysisNeeded: string;
  analysisComplete: string;
  
  // Patient List
  patientList: string;
  patientId: string;
  patientName: string;
  age: string;
  gender: string;
  diagnosisDate: string;
  status: string;
  uploadImages: string;
  selectFiles: string;
  examDate: string;
  chartNumber: string;
  patientSearch: string;
  department: string;
  allDepartments: string;
  search: string;
  from: string;
  to: string;
  doctorInCharge: string;
  analysisStatus: string;
  mriUpload: string;
  uploadedFiles: string;
  fileSize: string;
  uploadDate: string;
  deleteFile: string;
  no: string;
  sexAge: string;
  description: string;
  analysisResult: string;
  
  // Departments
  neurosurgery: string;
  neurology: string;
  radiology: string;
  internalMedicine: string;
  surgery: string;
  
  // MRI Views
  axialView: string;
  coronalView: string;
  sagittalView: string;
  breast3dView: string;
  imageList: string;
  fullscreen: string;
  
  // Feature Table
  featureAnalysis: string;
  disabledFeatures: string;
  feature: string;
  value: string;
  morphology: string;
  volume: string;
  surfaceArea: string;
  compactness: string;
  sphericity: string;
  elongation: string;
  flatness: string;
  glcmTexture: string;
  contrast: string;
  correlation: string;
  homogeneity: string;
  shortRunEmphasis: string;
  longRunEmphasis: string;
  smallZoneEmphasis: string;
  glrlm: string;
  largeZoneEmphasis: string;
  glszm: string;
  coarseness: string;
  busyness: string;
  strength: string;
  ngtdm: string;
  maximum3DDiameter: string;
  standardDeviation: string;
  skewness: string;
  kurtosis: string;
  
  // Shapley Chart
  shapleyValues: string;
  importance: string;
  
  // LLM Analysis
  aiAnalysis: string;
  confidence: string;
  recommendation: string;
  keyFindings: string;
  benignTumor: string;
  analysisCompleteAt: string;
  
  // Common
  loading: string;
  error: string;
  success: string;
  cancel: string;
  confirm: string;
  save: string;
  delete: string;
  edit: string;
  view: string;
  download: string;
  upload: string;
  
  // Authentication & Navigation
  logout: string;
  login: string;
  testUserLoggedIn: string;
  adminLoggedIn: string;
  previous: string;
  next: string;
  
  // Drawing Messages
  noDrawingFiles: string;
  drawingInstructions: string;
  
  // Count & Pagination Messages
  itemsCount: string; // "건"
  pageInfo: string; // "페이지"
  totalItems: string; // "총"
  searchResults: string; // "검색 결과"
  searchReset: string; // "검색 초기화"
  
  // File Operation Messages
  fileUploaded: string; // "파일 업로드"
  fileUploadSuccess: string; // "파일이 성공적으로 업로드되었습니다"
  fileDeleteConfirm: string; // "파일을 삭제하시겠습니까?"
  fileDeleteSuccess: string; // "파일이 성공적으로 삭제되었습니다"
  fileNameChanged: string; // "파일명이 성공적으로 변경되었습니다"
  drawingFileSaved: string; // "드로잉 파일이 저장되었습니다"
  fileSavedLocally: string; // "파일이 로컬에 저장되었습니다"
  fileSaved: string; // "파일이 저장되었습니다"
  diagnosisSaved: string; // "진단명이 저장되었습니다"
  descriptionSaved: string; // "Description이 저장되었습니다"
  fileLoadSuccess: string; // "파일 업로드"
  fileLoadFailed: string; // "로드 실패"
  fileSelectedForImageList: string; // "파일이 이미지 리스트에 선택됨"
  
  // Fullscreen Viewer Tools
  colormap: string; // "컬러맵"
  invert: string; // "반전"
  gamma: string; // "감마"
  pen: string; // "펜"
  highlighter: string; // "형광펜"
  eraser: string; // "지우개"
  brushSize: string; // "크기"
  clearAll: string; // "전체삭제"
  drawingTools: string; // "드로잉 도구"
  clearAllConfirm: string; // "표시된 내용을 전체 삭제하시겠습니까?"
  opacity: string; // "투명도"
  transparency: string; // "투명도"
  color: string; // "색상"
  
  // Color options
  red: string; // "빨강"
  blue: string; // "파랑"
  green: string; // "초록"
  yellow: string; // "노랑"
  hot: string; // "Hot"
  cool: string; // "Cool"
  jet: string; // "Jet"
  
  // Language names
  korean: string;
  english: string;
  thai: string;
  chinese: string;
}

export const translations: Record<Language, Translations> = {
  ko: {
    // Dashboard Header
    dashboardTitle: 'OncoType DX 유방암 분석 대시보드',
    dashboardSubtitle: 'OncoType DX Breast Cancer Analysis Dashboard - AI 기반 진단 지원 시스템',
    doctorId: '의사 ID',
    patientCount: '환자 수',
    analysisNeeded: '분석 필요',
    analysisComplete: '분석 완료',
    
    // Patient List
    patientList: '환자 목록',
    patientId: '환자 ID',
    patientName: '환자명',
    age: '나이',
    gender: '성별',
    diagnosisDate: '진단일',
    status: '상태',
    uploadImages: '이미지 업로드',
    selectFiles: '파일 선택',
    examDate: '검사 날짜',
    chartNumber: '차트 번호',
    patientSearch: '환자 검색',
    department: '진료과',
    allDepartments: '전체',
    search: '조회',
    from: '부터',
    to: '까지',
    doctorInCharge: '담당의',
    analysisStatus: '분석 상태',
    mriUpload: 'CT 업로드',
    uploadedFiles: 'CT file',
    fileSize: '크기',
    uploadDate: '업로드',
    deleteFile: '파일 삭제',
    no: 'No.',
    sexAge: 'S/A',
    description: 'DESCRIPTION',
    analysisResult: '분석 결과',
    
    // Departments
    neurosurgery: '신경외과',
    neurology: '신경과',
    radiology: '영상의학과',
    internalMedicine: '내과',
    surgery: '외과',
    
    // MRI Views
    axialView: 'Axial View',
    coronalView: 'Coronal View',
    sagittalView: 'Sagittal View',
    breast3dView: '3D Breast View',
    imageList: 'MRI LIST',
    fullscreen: '전체 화면',
    
    // Feature Table
    featureAnalysis: 'Feature Analysis',
    disabledFeatures: '비활성화된 특성',
    feature: '특성',
    value: '값',
    morphology: '형태학 (Morphology)',
    volume: '부피 (cc)',
    surfaceArea: '표면적 (cm²)',
    compactness: 'Compactness (0-1)',
    sphericity: 'Sphericity (0-1)',
    elongation: 'Elongation (비율)',
    flatness: 'Flatness (0-1)',
    glcmTexture: 'GLCM (Texture)',
    contrast: 'Contrast',
    correlation: 'Correlation',
    homogeneity: 'Homogeneity',
    shortRunEmphasis: 'Short Run Emphasis',
    longRunEmphasis: 'Long Run Emphasis',
    smallZoneEmphasis: 'Small-Zone Emphasis',
    glrlm: 'GLRLM',
    largeZoneEmphasis: 'Large-Zone Emphasis',
    glszm: 'GLSZM',
    coarseness: 'Coarseness',
    busyness: 'Busyness',
    strength: 'Strength',
    ngtdm: 'NGTDM',
    maximum3DDiameter: 'Maximum 3D diameter (mm)',
    standardDeviation: '표준편차 (AU)',
    skewness: 'Skewness',
    kurtosis: 'Kurtosis',
    
    // Shapley Chart
    shapleyValues: 'Shapley Values',
    importance: '중요도',
    
    // LLM Analysis
    aiAnalysis: 'AI 분석',
    confidence: '신뢰도',
    recommendation: '권장사항',
    keyFindings: '주요 소견',
    benignTumor: '양성 종양 (Benign Tumor)',
    analysisCompleteAt: '분석 완료',
    
    // Common
    loading: '로딩 중...',
    error: '오류',
    success: '성공',
    cancel: '취소',
    confirm: '확인',
    save: '저장',
    delete: '삭제',
    edit: '편집',
    view: '보기',
    download: '다운로드',
    upload: '업로드',
    
    // Authentication & Navigation
    logout: '로그아웃',
    login: '로그인',
    testUserLoggedIn: '테스트 사용자로 로그인됨',
    adminLoggedIn: '관리자로 로그인됨',
    previous: '이전',
    next: '다음',
    
    // Drawing Messages
    noDrawingFiles: 'Drawing 후 저장된 파일이 없습니다.',
    drawingInstructions: 'Drawing Viewer에서 종양 부분을 표시하고 저장하세요.',
    
    // Count & Pagination Messages
    itemsCount: '건',
    pageInfo: '페이지',
    totalItems: '총',
    searchResults: '검색 결과',
    searchReset: '검색 초기화',
    
    // File Operation Messages
    fileUploaded: '파일 업로드',
    fileUploadSuccess: '파일이 성공적으로 업로드되었습니다',
    fileDeleteConfirm: '파일을 삭제하시겠습니까?',
    fileDeleteSuccess: '파일이 성공적으로 삭제되었습니다',
    fileNameChanged: '파일명이 성공적으로 변경되었습니다',
    drawingFileSaved: '드로잉 파일이 저장되었습니다',
    fileSavedLocally: '파일이 로컬에 저장되었습니다',
    fileSaved: '파일이 저장되었습니다',
    diagnosisSaved: '진단명이 저장되었습니다',
    descriptionSaved: 'Description이 저장되었습니다',
    fileLoadSuccess: '파일 업로드',
    fileLoadFailed: '로드 실패',
    fileSelectedForImageList: '파일이 이미지 리스트에 선택됨',
    
    // Fullscreen Viewer Tools
    colormap: '컬러맵',
    invert: '반전',
    gamma: '감마',
    pen: '펜',
    highlighter: '형광펜',
    eraser: '지우개',
    brushSize: '크기',
    clearAll: '전체삭제',
    drawingTools: '드로잉 도구',
    clearAllConfirm: '표시된 내용을 전체 삭제하시겠습니까?',
    opacity: '투명도',
    transparency: '투명도',
    color: '색상',
    
    // Color options
    red: '빨강',
    blue: '파랑',
    green: '초록',
    yellow: '노랑',
    hot: 'Hot',
    cool: 'Cool',
    jet: 'Jet',
    
    // Language names
    korean: '한국어',
    english: 'English',
    thai: 'ไทย',
    chinese: '中文',
  },
  
  en: {
    // Dashboard Header
    dashboardTitle: 'OncoType DX Breast Cancer Analysis Dashboard',
    dashboardSubtitle: 'AI-powered Diagnostic Support System for OncoType DX Breast Cancer Analysis',
    doctorId: 'Doctor ID',
    patientCount: 'Patients',
    analysisNeeded: 'Need Analysis',
    analysisComplete: 'Complete',
    
    // Patient List
    patientList: 'Patient List',
    patientId: 'Patient ID',
    patientName: 'Patient Name',
    age: 'Age',
    gender: 'Gender',
    diagnosisDate: 'Diagnosis Date',
    status: 'Status',
    uploadImages: 'Upload Images',
    selectFiles: 'Select Files',
    examDate: 'Exam Date',
    chartNumber: 'Chart Number',
    patientSearch: 'Patient Search',
    department: 'Department',
    allDepartments: 'All',
    search: 'Search',
    from: 'From',
    to: 'To',
    doctorInCharge: 'Doctor',
    analysisStatus: 'Analysis Status',
    mriUpload: 'CT Upload',
    uploadedFiles: 'CT Files',
    fileSize: 'Size',
    uploadDate: 'Upload Date',
    deleteFile: 'Delete File',
    no: 'No.',
    sexAge: 'S/A',
    description: 'DESCRIPTION',
    analysisResult: 'Analysis Result',
    
    // Departments
    neurosurgery: 'Neurosurgery',
    neurology: 'Neurology',
    radiology: 'Radiology',
    internalMedicine: 'Internal Medicine',
    surgery: 'Surgery',
    
    // MRI Views
    axialView: 'Axial View',
    coronalView: 'Coronal View',
    sagittalView: 'Sagittal View',
    breast3dView: '3D Breast View',
    imageList: 'MRI LIST',
    fullscreen: 'Full screen',
    
    // Feature Table
    featureAnalysis: 'Feature Analysis',
    disabledFeatures: 'Disabled Features',
    feature: 'Feature',
    value: 'Value',
    morphology: 'Morphology',
    volume: 'Volume (cc)',
    surfaceArea: 'Surface Area (cm²)',
    compactness: 'Compactness (0-1)',
    sphericity: 'Sphericity (0-1)',
    elongation: 'Elongation (ratio)',
    flatness: 'Flatness (0-1)',
    glcmTexture: 'GLCM (Texture)',
    contrast: 'Contrast',
    correlation: 'Correlation',
    homogeneity: 'Homogeneity',
    shortRunEmphasis: 'Short Run Emphasis',
    longRunEmphasis: 'Long Run Emphasis',
    smallZoneEmphasis: 'Small-Zone Emphasis',
    glrlm: 'GLRLM',
    largeZoneEmphasis: 'Large-Zone Emphasis',
    glszm: 'GLSZM',
    coarseness: 'Coarseness',
    busyness: 'Busyness',
    strength: 'Strength',
    ngtdm: 'NGTDM',
    maximum3DDiameter: 'Maximum 3D diameter (mm)',
    standardDeviation: 'Standard Deviation (AU)',
    skewness: 'Skewness',
    kurtosis: 'Kurtosis',
    
    // Shapley Chart
    shapleyValues: 'Shapley Values',
    importance: 'Importance',
    
    // LLM Analysis
    aiAnalysis: 'AI Analysis',
    confidence: 'Confidence',
    recommendation: 'Recommendation',
    keyFindings: 'Key Findings',
    benignTumor: 'Benign Tumor',
    analysisCompleteAt: 'Analysis Complete',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    download: 'Download',
    upload: 'Upload',
    
    // Authentication & Navigation
    logout: 'Logout',
    login: 'Login',
    testUserLoggedIn: 'Logged in as Test User',
    adminLoggedIn: 'Logged in as Administrator',
    previous: 'Previous',
    next: 'Next',
    
    // Drawing Messages
    noDrawingFiles: 'No saved files after drawing.',
    drawingInstructions: 'Please mark tumor areas in Drawing Viewer and save.',
    
    // Count & Pagination Messages
    itemsCount: ' patient',
    pageInfo: 'Page',
    totalItems: 'Total',
    searchResults: 'Search Results',
    searchReset: 'Reset Search',
    
    // File Operation Messages
    fileUploaded: 'File Uploaded',
    fileUploadSuccess: 'File uploaded successfully',
    fileDeleteConfirm: 'Are you sure you want to delete this file?',
    fileDeleteSuccess: 'File deleted successfully',
    fileNameChanged: 'File name changed successfully',
    drawingFileSaved: 'Drawing file saved successfully',
    fileSavedLocally: 'File saved locally',
    fileSaved: 'File saved',
    diagnosisSaved: 'Diagnosis saved',
    descriptionSaved: 'Description saved',
    fileLoadSuccess: 'File loaded',
    fileLoadFailed: 'Load failed',
    fileSelectedForImageList: 'File selected for image list',
    
    // Fullscreen Viewer Tools
    colormap: 'Colormap',
    invert: 'Invert',
    gamma: 'Gamma',
    pen: 'Pen',
    highlighter: 'Highlighter',
    eraser: 'Eraser',
    brushSize: 'Brush Size',
    clearAll: 'Clear All',
    drawingTools: 'Drawing Tools',
    clearAllConfirm: 'Do you want to clear all displayed content?',
    opacity: 'Opacity',
    transparency: 'Transparency',
    color: 'Color',
    
    // Color options
    red: 'Red',
    blue: 'Blue',
    green: 'Green',
    yellow: 'Yellow',
    hot: 'Hot',
    cool: 'Cool',
    jet: 'Jet',
    
    // Language names
    korean: '한국어',
    english: 'English',
    thai: 'ไทย',
    chinese: '中文',
  },
  
  th: {
    // Dashboard Header
    dashboardTitle: 'แดชบอร์ดการวิเคราะห์ OncoType DX มะเร็งเต้านม',
    dashboardSubtitle: 'ระบบสนับสนุนการวินิจฉัยด้วย AI สำหรับการวิเคราะห์ OncoType DX มะเร็งเต้านม',
    doctorId: 'รหัสแพทย์',
    patientCount: 'ผู้ป่วย',
    analysisNeeded: 'ต้องวิเคราะห์',
    analysisComplete: 'เสร็จสิ้น',
    
    // Patient List
    patientList: 'รายชื่อผู้ป่วย',
    patientId: 'รหัสผู้ป่วย',
    patientName: 'ชื่อผู้ป่วย',
    age: 'อายุ',
    gender: 'เพศ',
    diagnosisDate: 'วันที่วินิจฉัย',
    status: 'สถานะ',
    uploadImages: 'อัปโหลดภาพ',
    selectFiles: 'เลือกไฟล์',
    examDate: 'วันที่ตรวจ',
    chartNumber: 'หมายเลขชาร์ต',
    patientSearch: 'ค้นหาผู้ป่วย',
    department: 'แผนก',
    allDepartments: 'ทั้งหมด',
    search: 'ค้นหา',
    from: 'จาก',
    to: 'ถึง',
    doctorInCharge: 'แพทย์',
    analysisStatus: 'สถานะการวิเคราะห์',
    mriUpload: 'อัปโหลด CT',
    uploadedFiles: 'ไฟล์ CT',
    fileSize: 'ขนาด',
    uploadDate: 'วันที่อัปโหลด',
    deleteFile: 'ลบไฟล์',
    no: 'ลำดับ',
    sexAge: 'เพศ/อายุ',
    description: 'คำอธิบาย',
    analysisResult: 'ผลการวิเคราะห์',
    
    // Departments
    neurosurgery: 'ศัลยกรรมประสาท',
    neurology: 'ประสาทวิทยา',
    radiology: 'รังสีวิทยา',
    internalMedicine: 'อายุรกรรม',
    surgery: 'ศัลยกรรม',
    
    // MRI Views
    axialView: 'มุมมองแกนนอน',
    coronalView: 'มุมมองแกนหน้า-หลัง',
    sagittalView: 'มุมมองแกนข้าง',
    breast3dView: 'มุมมองเต้านม 3 มิติ',
    imageList: 'MRI LIST',
    fullscreen: 'เต็มหน้าจอ',
    
    // Feature Table
    featureAnalysis: 'การวิเคราะห์คุณลักษณะ',
    disabledFeatures: 'คุณลักษณะที่ปิดใช้งาน',
    feature: 'คุณลักษณะ',
    value: 'ค่า',
    morphology: 'สัณฐานวิทยา',
    volume: 'ปริมาตร (cc)',
    surfaceArea: 'พื้นที่ผิว (cm²)',
    compactness: 'ความกะทัดรัด (0-1)',
    sphericity: 'ความเป็นทรงกลม (0-1)',
    elongation: 'การยืดยาว (อัตราส่วน)',
    flatness: 'ความแบน (0-1)',
    glcmTexture: 'GLCM (เนื้อสัมผัส)',
    contrast: 'ความแตกต่าง',
    correlation: 'ความสัมพันธ์',
    homogeneity: 'ความเป็นเนื้อเดียวกัน',
    shortRunEmphasis: 'การเน้นช่วงสั้น',
    longRunEmphasis: 'การเน้นช่วงยาว',
    smallZoneEmphasis: 'การเน้นโซนเล็ก',
    glrlm: 'GLRLM',
    largeZoneEmphasis: 'การเน้นโซนใหญ่',
    glszm: 'GLSZM',
    coarseness: 'ความหยาบ',
    busyness: 'ความยุ่งเหยิง',
    strength: 'ความแข็งแรง',
    ngtdm: 'NGTDM',
    maximum3DDiameter: 'เส้นผ่านศูนย์กลาง 3D สูงสุด (mm)',
    standardDeviation: 'ส่วนเบี่ยงเบนมาตรฐาน (AU)',
    skewness: 'ความเบ้',
    kurtosis: 'ความโด่ง',
    
    // Shapley Chart
    shapleyValues: 'ค่า Shapley',
    importance: 'ความสำคัญ',
    
    // LLM Analysis
    aiAnalysis: 'การวิเคราะห์ AI',
    confidence: 'ความเชื่อมั่น',
    recommendation: 'คำแนะนำ',
    keyFindings: 'ผลการตรวจหลัก',
    benignTumor: 'เนื้องอกไม่ร้ายแรง',
    analysisCompleteAt: 'การวิเคราะห์เสร็จสิ้น',
    
    // Common
    loading: 'กำลังโหลด...',
    error: 'ข้อผิดพลาด',
    success: 'สำเร็จ',
    cancel: 'ยกเลิก',
    confirm: 'ยืนยัน',
    save: 'บันทึก',
    delete: 'ลบ',
    edit: 'แก้ไข',
    view: 'ดู',
    download: 'ดาวน์โหลด',
    upload: 'อัปโหลด',
    
    // Authentication & Navigation
    logout: 'ออกจากระบบ',
    login: 'เข้าสู่ระบบ',
    testUserLoggedIn: 'เข้าสู่ระบบในฐานะผู้ใช้ทดสอบ',
    adminLoggedIn: 'เข้าสู่ระบบในฐานะผู้ดูแลระบบ',
    previous: 'ก่อนหน้า',
    next: 'ถัดไป',
    
    // Drawing Messages
    noDrawingFiles: 'ไม่มีไฟล์ที่บันทึกหลังจากการวาด',
    drawingInstructions: 'กรุณาทำเครื่องหมายบริเวณเนื้องอกใน Drawing Viewer และบันทึก',
    
    // Count & Pagination Messages
    itemsCount: 'รายการ',
    pageInfo: 'หน้า',
    totalItems: 'ทั้งหมด',
    searchResults: 'ผลการค้นหา',
    searchReset: 'รีเซ็ตการค้นหา',
    
    // File Operation Messages
    fileUploaded: 'อัปโหลดไฟล์',
    fileUploadSuccess: 'อัปโหลดไฟล์สำเร็จ',
    fileDeleteConfirm: 'คุณแน่ใจหรือไม่ที่จะลบไฟล์นี้?',
    fileDeleteSuccess: 'ลบไฟล์สำเร็จ',
    fileNameChanged: 'เปลี่ยนชื่อไฟล์สำเร็จ',
    drawingFileSaved: 'บันทึกไฟล์การวาดสำเร็จ',
    fileSavedLocally: 'บันทึกไฟล์ในเครื่องสำเร็จ',
    fileSaved: 'บันทึกไฟล์สำเร็จ',
    diagnosisSaved: 'บันทึกการวินิจฉัยสำเร็จ',
    descriptionSaved: 'บันทึกคำอธิบายสำเร็จ',
    fileLoadSuccess: 'โหลดไฟล์สำเร็จ',
    fileLoadFailed: 'โหลดไฟล์ล้มเหลว',
    fileSelectedForImageList: 'เลือกไฟล์สำหรับรายการภาพ',
    
    // Fullscreen Viewer Tools
    colormap: 'แผนที่สี',
    invert: 'กลับสี',
    gamma: 'แกมมา',
    pen: 'ปากกา',
    highlighter: 'ปากกาเน้นข้อความ',
    eraser: 'ยางลบ',
    brushSize: 'ขนาดแปรง',
    clearAll: 'ลบทั้งหมด',
    drawingTools: 'เครื่องมือวาด',
    clearAllConfirm: 'คุณต้องการลบเนื้อหาที่แสดงทั้งหมดหรือไม่?',
    opacity: 'ความโปร่งใส',
    transparency: 'ความโปร่งใส',
    color: 'สี',
    
    // Color options
    red: 'แดง',
    blue: 'น้ำเงิน',
    green: 'เขียว',
    yellow: 'เหลือง',
    hot: 'Hot',
    cool: 'Cool',
    jet: 'Jet',
    
    // Language names
    korean: '한국어',
    english: 'English',
    thai: 'ไทย',
    chinese: '中文',
  },
  
  zh: {
    // Dashboard Header
    dashboardTitle: 'OncoType DX乳腺癌分析仪表板',
    dashboardSubtitle: 'AI驱动的OncoType DX乳腺癌分析诊断支持系统',
    doctorId: '医生ID',
    patientCount: '患者数',
    analysisNeeded: '需要分析',
    analysisComplete: '分析完成',
    
    // Patient List
    patientList: '患者列表',
    patientId: '患者ID',
    patientName: '患者姓名',
    age: '年龄',
    gender: '性别',
    diagnosisDate: '诊断日期',
    status: '状态',
    uploadImages: '上传图像',
    selectFiles: '选择文件',
    examDate: '检查日期',
    chartNumber: '病历号',
    patientSearch: '患者搜索',
    department: '科室',
    allDepartments: '全部',
    search: '查询',
    from: '从',
    to: '到',
    doctorInCharge: '医生',
    analysisStatus: '分析状态',
    mriUpload: 'CT上传',
    uploadedFiles: 'CT文件',
    fileSize: '大小',
    uploadDate: '上传日期',
    deleteFile: '删除文件',
    no: '序号',
    sexAge: '性别/年龄',
    description: '描述',
    analysisResult: '分析结果',
    
    // Departments
    neurosurgery: '神经外科',
    neurology: '神经内科',
    radiology: '影像科',
    internalMedicine: '内科',
    surgery: '外科',
    
    // MRI Views
    axialView: '轴位视图',
    coronalView: '冠状位视图',
    sagittalView: '矢状位视图',
    breast3dView: '3D乳腺视图',
    imageList: 'MRI LIST',
    fullscreen: '全屏',
    
    // Feature Table
    featureAnalysis: '特征分析',
    disabledFeatures: '已禁用特征',
    feature: '特征',
    value: '值',
    morphology: '形态学',
    volume: '体积 (cc)',
    surfaceArea: '表面积 (cm²)',
    compactness: '紧密度 (0-1)',
    sphericity: '球形度 (0-1)',
    elongation: '伸长率 (比例)',
    flatness: '平坦度 (0-1)',
    glcmTexture: 'GLCM (纹理)',
    contrast: '对比度',
    correlation: '相关性',
    homogeneity: '同质性',
    shortRunEmphasis: '短程强调',
    longRunEmphasis: '长程强调',
    smallZoneEmphasis: '小区域强调',
    glrlm: 'GLRLM',
    largeZoneEmphasis: '大区域强调',
    glszm: 'GLSZM',
    coarseness: '粗糙度',
    busyness: '繁忙度',
    strength: '强度',
    ngtdm: 'NGTDM',
    maximum3DDiameter: '最大3D直径 (mm)',
    standardDeviation: '标准差 (AU)',
    skewness: '偏度',
    kurtosis: '峰度',
    
    // Shapley Chart
    shapleyValues: 'Shapley值',
    importance: '重要性',
    
    // LLM Analysis
    aiAnalysis: 'AI分析',
    confidence: '置信度',
    recommendation: '建议',
    keyFindings: '主要发现',
    benignTumor: '良性肿瘤',
    analysisCompleteAt: '分析完成',
    
    // Common
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    view: '查看',
    download: '下载',
    upload: '上传',
    
    // Authentication & Navigation
    logout: '退出登录',
    login: '登录',
    testUserLoggedIn: '以测试用户身份登录',
    adminLoggedIn: '以管理员身份登录',
    previous: '上一页',
    next: '下一页',
    
    // Drawing Messages
    noDrawingFiles: '绘制后没有保存的文件。',
    drawingInstructions: '请在绘图查看器中标记肿瘤区域并保存。',
    
    // Count & Pagination Messages
    itemsCount: '项',
    pageInfo: '页',
    totalItems: '总计',
    searchResults: '搜索结果',
    searchReset: '重置搜索',
    
    // File Operation Messages
    fileUploaded: '文件上传',
    fileUploadSuccess: '文件上传成功',
    fileDeleteConfirm: '确定要删除此文件吗？',
    fileDeleteSuccess: '文件删除成功',
    fileNameChanged: '文件名修改成功',
    drawingFileSaved: '绘图文件保存成功',
    fileSavedLocally: '文件已保存到本地',
    fileSaved: '文件已保存',
    diagnosisSaved: '诊断已保存',
    descriptionSaved: '描述已保存',
    fileLoadSuccess: '文件已加载',
    fileLoadFailed: '加载失败',
    fileSelectedForImageList: '文件已选择为图像列表',
    
    // Fullscreen Viewer Tools
    colormap: '色彩映射',
    invert: '反转',
    gamma: '伽马',
    pen: '画笔',
    highlighter: '荧光笔',
    eraser: '橡皮擦',
    brushSize: '画笔大小',
    clearAll: '全部清除',
    drawingTools: '绘图工具',
    clearAllConfirm: '您要清除所有显示的内容吗？',
    opacity: '透明度',
    transparency: '透明度',
    color: '颜色',
    
    // Color options
    red: '红色',
    blue: '蓝色',
    green: '绿色',
    yellow: '黄色',
    hot: 'Hot',
    cool: 'Cool',
    jet: 'Jet',
    
    // Language names
    korean: '한국어',
    english: 'English',
    thai: 'ไทย',
    chinese: '中文',
  },
};

export function getTranslation(language: Language): Translations {
  return translations[language] || translations.ko;
}
