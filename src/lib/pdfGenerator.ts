import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PatientData {
  name: string;
  gender: string;
  birthDate: string;
  age: number;
  patientNumber: string;
  examDate: string;
  mriEquipment: string;
}

export interface AnalysisResult {
  oncotypeDxScore: number;
  riskCategory: string;
  confidence: number;
  recommendations: string[];
}

export interface RadiomicsFindings {
  contrastEnhancement: { value: number; normal: string; status: string };
  tumorBoundary: { value: number; normal: string; status: string };
  tumorHeterogeneity: { value: number; normal: string; status: string };
  tumorSize: { value: number; normal: string; status: string };
  perfusionPattern: { value: number; normal: string; status: string };
}

export interface ReportData {
  reportId: string;
  generatedDate: string;
  patient: PatientData;
  analysisResult: AnalysisResult;
  radiomicsFindings: RadiomicsFindings;
}

// 기본 리포트 데이터 (샘플)
export const getDefaultReportData = (): ReportData => ({
  reportId: 'R-2024112901',
  generatedDate: new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }),
  patient: {
    name: '홍길순',
    gender: 'F',
    birthDate: '1976-03-15',
    age: 48,
    patientNumber: '20241120-001',
    examDate: '2024-11-15',
    mriEquipment: 'Siemens 3T'
  },
  analysisResult: {
    oncotypeDxScore: 42,
    riskCategory: '중간위험군 (26-50)',
    confidence: 87,
    recommendations: [
      'OncoType DX 유전자 검사 실시 권장',
      '항암화학요법 필요성 재평가 필요'
    ]
  },
  radiomicsFindings: {
    contrastEnhancement: { value: 0.78, normal: '0.45-0.65', status: '높음' },
    tumorBoundary: { value: 1.92, normal: '1.20-1.50', status: '높음' },
    tumorHeterogeneity: { value: 2.34, normal: '1.80-2.10', status: '중간' },
    tumorSize: { value: 3.2, normal: '<2.0', status: '큼' },
    perfusionPattern: { value: 0.65, normal: '0.40-0.55', status: '높음' }
  }
});

// HTML 리포트 템플릿 생성
const createReportHTML = (data: ReportData): string => {
  return `
    <div style="
      font-family: 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
      width: 794px;
      padding: 40px;
      background: white;
      color: #333;
      line-height: 1.6;
    ">
      <!-- 헤더 -->
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
        <h1 style="font-size: 28px; font-weight: bold; color: #1e40af; margin: 0;">
          OncoType AI 분석 리포트
        </h1>
        <div style="margin-top: 15px; font-size: 14px; color: #666;">
          생성일시: ${data.generatedDate} | 보고서 ID: ${data.reportId}
        </div>
      </div>

      <!-- 환자 정보 -->
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 20px; font-weight: bold; color: #1e40af; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          환자정보
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
          <div>• 이름: ${data.patient.name} (${data.patient.gender})</div>
          <div>• 생년월일: ${data.patient.birthDate} (${data.patient.age}세)</div>
          <div>• 환자번호: ${data.patient.patientNumber}</div>
          <div>• 촬영일자: ${data.patient.examDate} | MRI 장비: ${data.patient.mriEquipment}</div>
        </div>
      </div>

      <!-- 분석 결과 요약 -->
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 20px; font-weight: bold; color: #1e40af; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          분석 결과 요약
        </h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center;">
            <div>
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">OncoType DX 예측 점수</div>
              <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${data.analysisResult.oncotypeDxScore}점</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">분류</div>
              <div style="font-size: 16px; font-weight: bold; color: #ea580c;">${data.analysisResult.riskCategory}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">신뢰도</div>
              <div style="font-size: 20px; font-weight: bold; color: #059669;">${data.analysisResult.confidence}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 권고사항 -->
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #1e40af; margin-bottom: 15px;">
          권고사항
        </h2>
        <div style="font-size: 14px;">
          ${data.analysisResult.recommendations.map(rec => `• ${rec}`).join('<br>')}
        </div>
      </div>

      <!-- 주요 Radiomics 소견 -->
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #1e40af; margin-bottom: 15px;">
          주요 Radiomics 소견
        </h2>
        <div style="font-size: 14px; line-height: 1.8;">
          <div>1. 조영증강 불균일도: ${data.radiomicsFindings.contrastEnhancement.value} (정상: ${data.radiomicsFindings.contrastEnhancement.normal}) - ${data.radiomicsFindings.contrastEnhancement.status}</div>
          <div>2. 종양 경계 불규칙성: ${data.radiomicsFindings.tumorBoundary.value} (정상: ${data.radiomicsFindings.tumorBoundary.normal}) - ${data.radiomicsFindings.tumorBoundary.status}</div>
          <div>3. 종양 이질성: ${data.radiomicsFindings.tumorHeterogeneity.value} (정상: ${data.radiomicsFindings.tumorHeterogeneity.normal}) - ${data.radiomicsFindings.tumorHeterogeneity.status}</div>
          <div>4. 종양 크기: ${data.radiomicsFindings.tumorSize.value} cm³ (기준: ${data.radiomicsFindings.tumorSize.normal}) - ${data.radiomicsFindings.tumorSize.status}</div>
          <div>5. 관류 패턴 변이: ${data.radiomicsFindings.perfusionPattern.value} (정상: ${data.radiomicsFindings.perfusionPattern.normal}) - ${data.radiomicsFindings.perfusionPattern.status}</div>
        </div>
      </div>

      <!-- 영상 자료 섹션 -->
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #1e40af; margin-bottom: 15px;">
          영상 자료
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
          <div style="border: 2px solid #e5e7eb; padding: 20px; border-radius: 8px;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">[Axial View]</div>
            <div style="height: 100px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;">
              MRI 영상
            </div>
          </div>
          <div style="border: 2px solid #e5e7eb; padding: 20px; border-radius: 8px;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">[Segmentation]</div>
            <div style="height: 100px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;">
              분할 영상
            </div>
          </div>
          <div style="border: 2px solid #e5e7eb; padding: 20px; border-radius: 8px;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">[AI Heatmap]</div>
            <div style="height: 100px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;">
              AI 히트맵
            </div>
          </div>
        </div>
      </div>

      <!-- 참고문헌 -->
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #1e40af; margin-bottom: 15px;">
          참고문헌
        </h2>
        <div style="font-size: 14px; line-height: 1.8;">
          • ASCO Clinical Practice Guideline 2023<br>
          • ESMO Breast Cancer Guidelines
        </div>
      </div>

      <!-- 푸터 -->
      <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 40px; font-size: 12px; color: #666; text-align: center; line-height: 1.6;">
        본 보고서는 의료진의 진단 보조를 위한 참고자료이며,<br>
        최종 진단 및 치료 결정은 담당 의사의 종합적 판단이 필요합니다.
      </div>
    </div>
  `;
};

// 인쇄 미리보기 창을 여는 함수
export const openPrintPreview = (reportData?: ReportData): void => {
  try {
    const data = reportData || getDefaultReportData();
    
    // 새 창에서 리포트 열기
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('팝업이 차단되었습니다. 팝업을 허용해주세요.');
      return;
    }

    // 인쇄용 HTML 생성
    const printHTML = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OncoType AI 분석 리포트</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
            background: white;
            color: #333;
            line-height: 1.6;
          }
          
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .no-print {
              display: none !important;
            }
          }
          
          .print-controls {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1000;
          }
          
          .print-controls button {
            margin: 0 3px;
            padding: 4px 8px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
          }
          
          .print-btn {
            background: #2563eb;
            color: white;
          }
          
          .print-btn:hover {
            background: #1d4ed8;
          }
          
          .close-btn {
            background: #6b7280;
            color: white;
          }
          
          .close-btn:hover {
            background: #4b5563;
          }
        </style>
      </head>
      <body>
        <div class="print-controls no-print">
          <button class="print-btn" onclick="window.print()">인쇄하기</button>
          <button class="close-btn" onclick="window.close()">닫기</button>
        </div>
        
        ${createReportHTML(data)}
        
        <script>
          // 인쇄 완료 후 창 닫기 (선택사항)
          window.addEventListener('afterprint', function() {
            // 사용자가 원하면 자동으로 창을 닫을 수 있음
            // setTimeout(() => window.close(), 1000);
          });
        </script>
      </body>
      </html>
    `;

    // 새 창에 HTML 작성
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // 페이지 로드 완료 후 포커스
    printWindow.onload = () => {
      printWindow.focus();
    };

    console.log('✅ 인쇄 미리보기 창 열기 완료');
  } catch (error) {
    console.error('❌ 인쇄 미리보기 실패:', error);
    throw error;
  }
};

// 기존 PDF 다운로드 함수 (필요시 사용)
export const generatePDFReport = async (reportData?: ReportData): Promise<void> => {
  try {
    const data = reportData || getDefaultReportData();
    
    // 임시 HTML 요소 생성
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = createReportHTML(data);
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    document.body.appendChild(tempDiv);

    // HTML을 Canvas로 변환
    const canvas = await html2canvas(tempDiv, {
      width: 794,
      height: 1123,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // 임시 요소 제거
    document.body.removeChild(tempDiv);

    // PDF 생성
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    
    // A4 크기에 맞게 이미지 추가
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // 첫 페이지 추가
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 필요한 경우 추가 페이지 생성
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // PDF 다운로드
    const fileName = `OncoType_AI_Report_${data.reportId}_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(fileName);

    console.log('✅ PDF 리포트 생성 완료:', fileName);
  } catch (error) {
    console.error('❌ PDF 생성 실패:', error);
    throw error;
  }
};

// 리포트 데이터를 세션 데이터에서 추출하는 함수
export const extractReportDataFromSession = (sessionData: any): ReportData => {
  if (!sessionData) {
    return getDefaultReportData();
  }

  const defaultData = getDefaultReportData();
  
  return {
    ...defaultData,
    analysisResult: {
      oncotypeDxScore: sessionData.ai_analysis?.llm_analysis?.confidence || defaultData.analysisResult.oncotypeDxScore,
      riskCategory: sessionData.ai_analysis?.llm_analysis?.diagnosis?.includes('중간') ? '중간위험군 (26-50)' : 
                   sessionData.ai_analysis?.llm_analysis?.diagnosis?.includes('높음') ? '고위험군 (51-100)' : 
                   '저위험군 (0-25)',
      confidence: sessionData.ai_analysis?.llm_analysis?.confidence || defaultData.analysisResult.confidence,
      recommendations: sessionData.ai_analysis?.llm_analysis?.key_findings || defaultData.analysisResult.recommendations
    }
  };
};
