#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OncoType DX Flask 마이크로서비스 API 서버
업로드된 파일 관리 및 AI 분석 결과 처리
"""

import os
import uuid
import json
import shutil
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # CORS 허용

# 설정
UPLOAD_FOLDER = Path('./uploads')
ALLOWED_EXTENSIONS = {'.nii', '.nii.gz'}
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB

app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# 업로드 폴더 생성
UPLOAD_FOLDER.mkdir(exist_ok=True)

def allowed_file(filename):
    """허용된 파일 확장자 확인"""
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)

def generate_session_id():
    """새로운 세션 ID (UUID) 생성"""
    return str(uuid.uuid4())

def get_session_folder(session_id):
    """세션 ID에 해당하는 폴더 경로 반환"""
    return UPLOAD_FOLDER / session_id

def save_session_metadata(session_id, metadata):
    """세션 메타데이터 저장"""
    session_folder = get_session_folder(session_id)
    session_folder.mkdir(exist_ok=True)
    
    metadata_file = session_folder / 'metadata.json'
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

def load_session_metadata(session_id):
    """세션 메타데이터 로드"""
    metadata_file = get_session_folder(session_id) / 'metadata.json'
    if metadata_file.exists():
        with open(metadata_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

@app.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'btumor-flask-server'
    })

@app.route('/api/session/create', methods=['POST'])
def create_session():
    """새로운 업로드 세션 생성"""
    try:
        session_id = generate_session_id()
        session_folder = get_session_folder(session_id)
        session_folder.mkdir(exist_ok=True)
        
        # 초기 메타데이터 생성
        metadata = {
            'session_id': session_id,
            'created_at': datetime.now().isoformat(),
            'files': {},
            'ai_analysis': {
                'llm_analysis': None,
                'shapley_values': None,
                'feature_analysis': None
            },
            'status': 'created'
        }
        
        save_session_metadata(session_id, metadata)
        
        logger.info(f"새 세션 생성: {session_id}")
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': '세션이 생성되었습니다.'
        })
        
    except Exception as e:
        logger.error(f"세션 생성 오류: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/session/<session_id>/upload', methods=['POST'])
def upload_files(session_id):
    """파일 업로드"""
    try:
        session_folder = get_session_folder(session_id)
        if not session_folder.exists():
            return jsonify({
                'success': False,
                'error': '세션을 찾을 수 없습니다.'
            }), 404
        
        # 메타데이터 로드
        metadata = load_session_metadata(session_id)
        if not metadata:
            return jsonify({
                'success': False,
                'error': '세션 메타데이터를 찾을 수 없습니다.'
            }), 404
        
        uploaded_files = []
        
        # 각 시퀀스 타입별로 파일 처리
        for sequence_type in ['T1', 'T1CE', 'T2', 'FLAIR']:
            if sequence_type in request.files:
                file = request.files[sequence_type]
                if file and file.filename and allowed_file(file.filename):
                    # 안전한 파일명 생성
                    filename = secure_filename(file.filename)
                    file_path = session_folder / f"{sequence_type}_{filename}"
                    
                    # 파일 저장
                    file.save(str(file_path))
                    
                    # 메타데이터 업데이트
                    metadata['files'][sequence_type] = {
                        'original_filename': file.filename,
                        'saved_filename': file_path.name,
                        'file_path': str(file_path),
                        'file_size': file_path.stat().st_size,
                        'uploaded_at': datetime.now().isoformat()
                    }
                    
                    uploaded_files.append({
                        'sequence_type': sequence_type,
                        'filename': file.filename,
                        'size': file_path.stat().st_size
                    })
                    
                    logger.info(f"파일 업로드 완료: {sequence_type} - {file.filename}")
        
        if not uploaded_files:
            return jsonify({
                'success': False,
                'error': '업로드된 파일이 없습니다.'
            }), 400
        
        # 메타데이터 저장
        metadata['status'] = 'files_uploaded'
        metadata['updated_at'] = datetime.now().isoformat()
        save_session_metadata(session_id, metadata)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'uploaded_files': uploaded_files,
            'message': f'{len(uploaded_files)}개 파일이 업로드되었습니다.'
        })
        
    except Exception as e:
        logger.error(f"파일 업로드 오류: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/session/<session_id>/analyze', methods=['POST'])
def start_analysis(session_id):
    """AI 분석 시작"""
    try:
        metadata = load_session_metadata(session_id)
        if not metadata:
            return jsonify({
                'success': False,
                'error': '세션을 찾을 수 없습니다.'
            }), 404
        
        session_folder = get_session_folder(session_id)
        
        # ⭐ 1. seg.nii.gz 파일 생성 (여기에 실제 AI 모델 코드 추가)
        seg_file_path = session_folder / 'seg.nii.gz'
        
        # 🔥 TODO: 실제 AI 모델로 segmentation 생성
        # 현재는 더미 파일 생성 - 실제로는 아래와 같이 구현:
        # 1. 업로드된 MRI 파일들 로드
        # 2. AI 모델에 입력
        # 3. segmentation 결과를 NIfTI 형식으로 저장
        with open(seg_file_path, 'wb') as f:
            f.write(b'dummy_segmentation_data')  # 실제로는 NIfTI 데이터
        
        # ⭐ 2. AI 분석 결과 생성 (여기에 실제 AI 분석 코드 추가)
        ai_analysis_results = {
            'llm_analysis': {
                'diagnosis': '뇌종양 의심 소견이 관찰됩니다.',
                'confidence': 87,
                'key_findings': [
                    '좌측 전두엽에 불규칙한 경계의 종괴 확인',
                    '조영증강 패턴이 악성 종양과 일치',
                    '주변 뇌부종 소견 동반'
                ],
                'recommendation': '추가 조영제 검사 및 조직검사 권장',
                'analysis_time': datetime.now().isoformat()
            },
            'shapley_values': {
                'values': [
                    {'feature': 'Volume', 'value': 0.45, 'positive': True},
                    {'feature': 'Surface Area', 'value': 0.32, 'positive': True},
                    {'feature': 'Sphericity', 'value': -0.18, 'positive': False},
                    {'feature': 'Compactness', 'value': 0.23, 'positive': True},
                    {'feature': 'Elongation', 'value': -0.12, 'positive': False}
                ],
                'importance': [
                    {'feature': 'Volume', 'value': 0.35},
                    {'feature': 'Surface Area', 'value': 0.28},
                    {'feature': 'Compactness', 'value': 0.22},
                    {'feature': 'Sphericity', 'value': 0.15}
                ]
            },
            'feature_analysis': {
                'radiomic_features': [
                    {'category': 'Shape', 'feature': 'Volume', 'value': 12.5, 'unit': 'cm³'},
                    {'category': 'Shape', 'feature': 'Surface Area', 'value': 45.2, 'unit': 'cm²'},
                    {'category': 'Intensity', 'feature': 'Mean', 'value': 156.8, 'unit': 'HU'},
                    {'category': 'Intensity', 'feature': 'Std Dev', 'value': 23.4, 'unit': 'HU'},
                    {'category': 'Texture', 'feature': 'Contrast', 'value': 0.78, 'unit': ''},
                    {'category': 'Texture', 'feature': 'Homogeneity', 'value': 0.65, 'unit': ''}
                ],
                'summary': {
                    'total_features': 6,
                    'significant_features': 4,
                    'analysis_method': 'PyRadiomics'
                }
            }
        }
        
        # 메타데이터 업데이트
        metadata['ai_analysis'] = ai_analysis_results
        metadata['seg_file_path'] = str(seg_file_path)
        metadata['status'] = 'analysis_completed'
        metadata['analysis_completed_at'] = datetime.now().isoformat()
        save_session_metadata(session_id, metadata)
        
        logger.info(f"AI 분석 완료: {session_id}")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'ai_analysis': ai_analysis_results,
            'seg_file_created': True,
            'message': 'AI 분석이 완료되었습니다.'
        })
        
    except Exception as e:
        logger.error(f"AI 분석 오류: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/session/<session_id>/analysis', methods=['GET'])
def get_analysis_results(session_id):
    """AI 분석 결과 조회"""
    try:
        metadata = load_session_metadata(session_id)
        if not metadata:
            return jsonify({
                'success': False,
                'error': '세션을 찾을 수 없습니다.'
            }), 404
        
        # seg.nii.gz 파일 존재 확인
        session_folder = get_session_folder(session_id)
        seg_file_path = session_folder / 'seg.nii.gz'
        seg_file_exists = seg_file_path.exists()
        
        if not seg_file_exists:
            return jsonify({
                'success': False,
                'error': 'seg 파일이 생성되지 않았습니다.',
                'seg_file_exists': False
            }), 404
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'ai_analysis': metadata.get('ai_analysis'),
            'seg_file_exists': seg_file_exists,
            'seg_file_path': str(seg_file_path) if seg_file_exists else None,
            'status': metadata['status']
        })
        
    except Exception as e:
        logger.error(f"분석 결과 조회 오류: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/session/<session_id>/seg-file', methods=['GET'])
def get_seg_file(session_id):
    """seg.nii.gz 파일 다운로드"""
    try:
        session_folder = get_session_folder(session_id)
        seg_file_path = session_folder / 'seg.nii.gz'
        
        if not seg_file_path.exists():
            return jsonify({
                'success': False,
                'error': 'seg 파일이 생성되지 않았습니다.'
            }), 404
        
        from flask import send_file
        return send_file(
            str(seg_file_path),
            as_attachment=True,
            download_name='seg.nii.gz',
            mimetype='application/octet-stream'
        )
        
    except Exception as e:
        logger.error(f"seg 파일 다운로드 오류: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/sessions', methods=['GET'])
def list_sessions():
    """모든 세션 목록 조회"""
    try:
        sessions = []
        for session_dir in UPLOAD_FOLDER.iterdir():
            if session_dir.is_dir():
                metadata = load_session_metadata(session_dir.name)
                if metadata:
                    sessions.append({
                        'session_id': session_dir.name,
                        'status': metadata['status'],
                        'created_at': metadata['created_at'],
                        'file_count': len(metadata['files'])
                    })
        
        return jsonify({
            'success': True,
            'sessions': sessions,
            'total_count': len(sessions)
        })
        
    except Exception as e:
        logger.error(f"세션 목록 조회 오류: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({
        'success': False,
        'error': '파일 크기가 너무 큽니다. (최대 500MB)'
    }), 413

if __name__ == '__main__':
    print("🚀 OncoType DX Flask 마이크로서비스 시작")
    print(f"📁 업로드 폴더: {UPLOAD_FOLDER.absolute()}")
    print("🌐 서버 주소: http://localhost:5001")
    print("📋 API 문서:")
    print("  - POST /api/session/create - 새 세션 생성")
    print("  - POST /api/session/<id>/upload - 파일 업로드")
    print("  - GET  /api/session/<id>/files - 파일 정보 조회")
    print("  - POST /api/session/<id>/analyze - AI 분석 시작")
    print("  - GET  /api/session/<id>/analysis - 분석 결과 조회")
    print("  - GET  /api/session/<id>/seg-file - seg.nii.gz 다운로드")
    print("  - GET  /api/sessions - 모든 세션 목록")
    print("  - GET  /health - 서버 상태 확인")
    
    app.run(debug=True, host='0.0.0.0', port=5001)
