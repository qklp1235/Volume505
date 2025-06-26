# 🌐 Volume505 사이트 정보 요청기

입력한 URL의 사이트 정보를 요청하고 표시하는 웹 애플리케이션입니다.

**🌍 도메인**: [www.volume505.com](https://www.volume505.com)

## ✨ 주요 기능

- **사이트 기본 정보**: URL, 제목, 설명 추출
- **기술 정보**: HTTP 상태 코드, 응답 시간, 콘텐츠 타입
- **메타 정보**: 키워드, 언어, 인코딩 정보
- **보안 정보**: HTTPS 여부, SSL 인증서 상태, 보안 헤더
- **AI 요약**: Perplexity AI를 통한 사이트 내용 자동 요약
- **실시간 상태 표시**: 로딩, 성공, 오류 상태 인디케이터
- **반응형 디자인**: 모바일과 데스크톱에서 모두 사용 가능

## 🚀 사용법

1. 웹 브라우저에서 [www.volume505.com](https://www.volume505.com) 방문
2. URL 입력 필드에 확인하고 싶은 웹사이트 주소를 입력
3. "정보 요청" 버튼을 클릭하거나 Enter 키를 누름
4. 사이트 정보가 카드 형태로 표시됨

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **AI Integration**: Perplexity AI API
- **Server**: Nginx, PM2
- **SSL**: Let's Encrypt
- **Proxy**: AllOrigins API (CORS 우회)

## 📁 파일 구조

```
├── index.html              # 메인 HTML 파일
├── styles.css              # CSS 스타일시트
├── script.js               # JavaScript 로직
├── server.js               # Express 서버
├── package.json            # Node.js 의존성
├── ecosystem.config.js     # PM2 설정
├── nginx.conf              # Nginx 설정
├── deploy.sh               # 배포 스크립트
├── env.example             # 환경 변수 템플릿
├── Logo/                   # 로고 이미지
└── README.md               # 프로젝트 설명서
```

## 🌐 도메인 연결 및 배포

### 1. 서버 준비
- Ubuntu 20.04+ 서버
- 도메인 DNS 설정 완료 (www.volume505.com → 서버 IP)

### 2. 자동 배포
```bash
# 배포 스크립트 실행
./deploy.sh
```

### 3. 수동 설정
```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp env.example .env
# .env 파일 편집하여 API 키 설정

# PM2로 서버 시작
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# SSL 인증서 설치
sudo certbot --nginx -d www.volume505.com -d volume505.com
```

## 🔧 주요 기능 설명

### 사이트 정보 추출
- HTML 파싱을 통한 메타 태그 분석
- Open Graph 태그 지원
- 다양한 인코딩 방식 감지

### AI 요약 기능
- Perplexity AI API 연동
- 한국어로 사이트 내용 자동 요약
- 마크다운 형식으로 구조화된 결과

### CORS 우회
- AllOrigins 프록시 서비스를 사용하여 CORS 제한 우회
- 안전한 외부 사이트 접근

### 보안 설정
- Helmet.js를 통한 보안 헤더 설정
- CORS 정책으로 허용된 도메인만 접근 가능
- SSL/TLS 암호화

### 사용자 경험
- 로딩 스피너와 상태 인디케이터
- 자동 URL 프로토콜 추가 (https://)
- 키보드 단축키 지원 (Ctrl+Enter)
- 반응형 그리드 레이아웃

## 🎨 디자인 특징

- **그라데이션 배경**: 모던한 시각적 효과
- **카드 기반 레이아웃**: 정보를 카테고리별로 구분
- **호버 효과**: 인터랙티브한 사용자 경험
- **애니메이션**: 부드러운 전환 효과
- **Volume505 브랜딩**: 커스텀 로고 및 색상

## ⚙️ 환경 변수 설정

`.env` 파일에 다음 설정이 필요합니다:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Domain Configuration
DOMAIN=www.volume505.com
ALLOWED_ORIGINS=https://www.volume505.com, https://volume505.com

# Perplexity AI API
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Security
SESSION_SECRET=your_session_secret_here
```

## 📊 모니터링

### Health Check
```bash
curl https://www.volume505.com/health
```

### PM2 상태 확인
```bash
pm2 status
pm2 logs volume505-site-info
```

### Nginx 상태 확인
```bash
sudo systemctl status nginx
sudo nginx -t
```

## ⚠️ 주의사항

- 일부 웹사이트는 CORS 정책으로 인해 정보를 가져올 수 없을 수 있습니다
- 프록시 서비스의 제한으로 인해 일부 사이트에서 오류가 발생할 수 있습니다
- HTTPS가 아닌 사이트는 보안 정보가 제한적으로 표시됩니다
- Perplexity API 키가 필요합니다

## 🔮 향후 개선 계획

- [ ] 더 많은 프록시 서비스 지원
- [ ] 사이트 스크린샷 기능
- [ ] SEO 점수 계산
- [ ] 성능 분석 기능
- [ ] 히스토리 저장 기능
- [ ] 사용자 대시보드
- [ ] API 사용량 모니터링

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

**개발자**: Volume505  
**도메인**: [www.volume505.com](https://www.volume505.com)  
**버전**: 1.0.0  
**최종 업데이트**: 2024년 