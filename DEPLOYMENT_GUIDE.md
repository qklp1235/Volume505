# 🌐 Volume505 도메인 연결 배포 가이드

이 가이드는 `www.volume505.com` 도메인을 연결하여 사이트 정보 요청기가 어떻게 작동하는 지 설명합니다.

## 📋 사전 준비사항

### 1. 도메인 설정
- `www.volume505.com` 도메인 소유
- DNS 관리 권한
- 도메인 등록업체에서 A 레코드 설정

### 2. 서버 준비
- Ubuntu 20.04+ 서버
- 최소 1GB RAM, 20GB 저장공간
- 공개 IP 주소
- SSH 접근 권한

## 🚀 1단계: DNS 설정

### 도메인 등록업체에서 A 레코드 추가
```
Type: A
Name: www
Value: [서버_IP_주소]
TTL: 3600 (또는 기본값)
```

### 추가 A 레코드 (루트 도메인용)
```
Type: A
Name: @ (또는 비워둠)
Value: [서버_IP_주소]
TTL: 3600
```

## 🖥️ 2단계: 서버 설정

### 서버에 접속
```bash
ssh username@your-server-ip
```

### 프로젝트 파일 업로드
```bash
# 로컬에서 파일 압축
tar -czf volume505-site-info.tar.gz *

# 서버로 업로드 (scp 사용)
scp volume505-site-info.tar.gz username@your-server-ip:~/

# 서버에서 압축 해제
tar -xzf volume505-site-info.tar.gz
cd volume505-site-info
```

## ⚙️ 3단계: 자동 배포

### 배포 스크립트 실행
```bash
# 실행 권한 부여
chmod +x deploy.sh

# 배포 실행
./deploy.sh
```

### 수동 배포 (선택사항)
```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 설치
sudo npm install -g pm2

# Nginx 설치
sudo apt install -y nginx

# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# 의존성 설치
npm install --production

# 환경 변수 설정
cp env.example .env
nano .env  # API 키 등 설정 편집
```

## 🔑 4단계: 환경 변수 설정

### .env 파일 편집
```bash
nano .env
```

### 필수 설정값
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Domain Configuration
DOMAIN=www.volume505.com
ALLOWED_ORIGINS=https://www.volume505.com,https://volume505.com

# Perplexity AI API (필수)
PERPLEXITY_API_KEY=sk-your-actual-api-key-here

# Security
SESSION_SECRET=your-random-session-secret-here
```

## 🔒 5단계: SSL 인증서 설치

### Let's Encrypt 인증서 발급
```bash
sudo certbot --nginx -d www.volume505.com -d volume505.com
```

### 인증서 자동 갱신 설정
```bash
# 갱신 테스트
sudo certbot renew --dry-run

# crontab에 자동 갱신 추가
sudo crontab -e
# 다음 줄 추가:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚀 6단계: 애플리케이션 시작

### PM2로 애플리케이션 시작
```bash
# 프로덕션 환경으로 시작
pm2 start ecosystem.config.js --env production

# PM2 설정 저장
pm2 save

# 시스템 부팅 시 자동 시작 설정
pm2 startup
```

### Nginx 재시작
```bash
sudo systemctl reload nginx
sudo systemctl enable nginx
```

## ✅ 7단계: 배포 확인

### 도메인 접속 테스트
```bash
# HTTP 리다이렉트 확인
curl -I http://www.volume505.com

# HTTPS 접속 확인
curl -I https://www.volume505.com

# Health check
curl https://www.volume505.com/health
```

### 브라우저에서 확인
- https://www.volume505.com 접속
- 사이트 정보 요청 기능 테스트
- AI 요약 기능 테스트

## 📊 8단계: 모니터링 설정

### PM2 상태 확인
```bash
pm2 status
pm2 logs volume505-site-info
```

### Nginx 로그 확인
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 시스템 리소스 모니터링
```bash
htop
df -h
free -h
```

## 🔧 9단계: 유지보수

### 애플리케이션 업데이트
```bash
# 코드 업데이트 후
pm2 restart volume505-site-info
pm2 save
```

### 로그 관리
```bash
# PM2 로그 정리
pm2 flush

# Nginx 로그 로테이션
sudo logrotate -f /etc/logrotate.d/nginx
```

### 백업 설정
```bash
# 애플리케이션 백업
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/volume505-site-info

# SSL 인증서 백업
sudo cp -r /etc/letsencrypt/live/www.volume505.com /backup/ssl/
```

## 🚨 문제 해결

### 일반적인 문제들

#### 1. 도메인 접속 안됨
```bash
# DNS 확인
nslookup www.volume505.com
dig www.volume505.com

# 방화벽 확인
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

#### 2. SSL 인증서 오류
```bash
# 인증서 상태 확인
sudo certbot certificates

# 인증서 재발급
sudo certbot --nginx -d www.volume505.com -d volume505.com --force-renewal
```

#### 3. 애플리케이션 오류
```bash
# PM2 로그 확인
pm2 logs volume505-site-info --lines 100

# 환경 변수 확인
pm2 env volume505-site-info

# 애플리케이션 재시작
pm2 restart volume505-site-info
```

#### 4. Nginx 오류
```bash
# 설정 파일 문법 확인
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# 오류 로그 확인
sudo tail -f /var/log/nginx/error.log
```

## 📞 지원
Pistolinkr@icloud.com


# 🌐 Volume505 Domain Connection Distribution Guide

This guide explains how the site information requester works by connecting to the `www.volume505.com` domain.

## 📋 Preliminary Preparations

### 1. Domain Settings
- Ownership of the `www.volume505.com` domain
- DNS management permissions
- A record settings from the domain registrar

### 2. Server Preparation
- Ubuntu 20.04+ server
- Minimum 1GB RAM, 20GB storage space
- Public IP address
- SSH access permissions

## 🚀 Step 1: DNS Settings

### Add an A record from the domain registrar
```
Type: A
Name: www
Value: [server_IP_address]
TTL: 3600 (or default)
```

### Additional A record (for root domain)
```
Type: A
Name: @ (or leave blank)
Value: [server_IP_address]
TTL: 3600
```

## 🖥️ Step 2: Server Setup

### Connect to the server
```bash
ssh username@your-server-ip
```

### Upload project files
```bash
# Compress files locally
tar -czf volume505-site-info.tar.gz *

# Upload to server (using scp)
scp volume505-site-info.tar.gz username@your-server-ip:~/

# Unzip on server
tar -xzf volume505-site-info.tar.gz
cd volume505-site-info
```

## ⚙️ Step 3: Automated deployment

### Run the deployment script
```bash
# Grant execution permissions
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Manual deployment (optional)
```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Install dependencies
npm install --production

# Set environment variables
cp env.example .env
nano .env  # Edit settings such as API keys
```

## 🔑 Step 4: Set environment variables

### Edit .env file
```bash
nano .env
```

### Required settings
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Domain Configuration
DOMAIN=www.volume505.com
ALLOWED_ORIGINS=https://www.volume505.com,https://volume505.com

# Perplexity AI API (required)
PERPLEXITY_API_KEY=sk-your-actual-api-key-here

# Security
SESSION_SECRET=your-random-session-secret-here
```

## 🔒 Step 5: Install SSL Certificate

### Issue Let's Encrypt Certificate
```bash
sudo certbot --nginx -d www.volume505.com -d volume505.com
```

### Set up automatic certificate renewal
```bash
# Renewal test
sudo certbot renew --dry-run

# Add automatic renewal to crontab
sudo crontab -e
# Add the following line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚀 Step 6: Start the application

### Start the application with PM2
```bash
# Start in production environment
pm2 start ecosystem.config.js --env production

# Save PM2 settings
pm2 save

# Set to start automatically at system boot
pm2 startup
```

### Restart Nginx
```bash
sudo systemctl reload nginx
sudo systemctl enable nginx
```

## ✅ Step 7: Verify deployment

### Domain access test
```bash
# Verify HTTP redirect
curl -I http://www.volume505.com

# Verify HTTPS access
curl -I https://www.volume505.com

# Health check
curl https://www.volume505.com/health
```

### Verify in browser
- Access https://www.volume505.com
- Test site information request function
- Test AI summary function

## 📊 Step 8: Set up monitoring

### Check PM2 status
```bash
pm2 status
pm2 logs volume505-site-info
```

### Check Nginx logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Monitor system resources
```bash
htop
df -h
free -h
```

## 🔧 Step 9: Maintenance

### Application Updates
```bash
# After updating the code
pm2 restart volume505-site-info
pm2 save
```

### Log Management
```bash
# PM2 log cleanup
pm2 flush

# Nginx log rotation
sudo logrotate -f /etc/logrotate.d/nginx
```

### Backup Settings
```bash
# Application Backup
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/volume505-site-info

# SSL Certificate Backup
sudo cp -r /etc/letsencrypt/live/www.volume505.com /backup/ssl/
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Domain Not Accessible
```bash
# DNS Check
nslookup www.volume505.com
dig www.volume505.com

# Firewall Check
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

#### 2. SSL certificate error
```bash
# Check certificate status
sudo certbot certificates

# Reissue certificate
sudo certbot --nginx -d www.volume505.com -d volume505.com --force-renewal
```

#### 3. Application error
```bash
# Check PM2 logs
pm2 logs volume505-site-info --lines 100

# Check environment variables
pm2 env volume505-site-info

# Restart application
pm2 restart volume505-site-info
```

#### 4. Nginx Errors
```bash
# Check configuration file syntax
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

## 📞 Support
Pistolinkr@icloud.com