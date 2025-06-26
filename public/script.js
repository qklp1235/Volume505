class SiteInfoRequester {
    constructor() {
        this.form = document.getElementById('urlForm');
        this.urlInput = document.getElementById('urlInput');
        this.submitBtn = document.getElementById('submitBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorText = document.getElementById('errorText');
        
        this.countrySelect = document.getElementById('countrySelect');
        this.toast = document.getElementById('toast');
        this.siteFavicon = document.getElementById('siteFavicon');
        this.summaryCard = document.querySelector('.ai-summary-card');
        this.summaryContent = document.getElementById('aiSummaryContent');
        
        this.sampleTopSites = {
            KR: ['naver.com', 'google.co.kr', 'youtube.com', 'daum.net', 'kakao.com', 'tistory.com', 'coupang.com', 'samsung.com', 'namu.wiki', 'netflix.com'],
            US: ['google.com', 'youtube.com', 'facebook.com', 'amazon.com', 'wikipedia.org', 'yahoo.com', 'reddit.com', 'twitter.com', 'instagram.com', 'netflix.com'],
            JP: ['google.co.jp', 'yahoo.co.jp', 'youtube.com', 'twitter.com', 'amazon.co.jp', 'rakuten.co.jp', 'wikipedia.org', 'goo.ne.jp', 'livedoor.com', 'mercari.com'],
            global: ['google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 'wikipedia.org', 'baidu.com', 'yahoo.com', 'yandex.ru', 'amazon.com']
        };

        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.urlInput.addEventListener('input', () => this.clearResults());
        this.urlInput.addEventListener('blur', () => this.autoPrependProtocol());
        this.form.setAttribute('novalidate', 'novalidate');

        // 오버레이/블러 효과 트리거
        this.urlInput.addEventListener('focus', () => this.activateOverlay(true));
        this.urlInput.addEventListener('blur', () => this.activateOverlay(false));
    }

    autoPrependProtocol() {
        let url = this.urlInput.value.trim();
        if (url && !/^https?:\/\//i.test(url)) {
            this.urlInput.value = 'https://' + url;
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const url = this.urlInput.value.trim();
        if (!this.isValidUrl(url)) {
            this.showToast('유효한 URL을 입력하세요.');
            this.urlInput.focus();
            return;
        }
        // 분석 시작 시 스크롤 애니메이션 즉시 실행
        window.scrollTo({
            top: 560,
            behavior: 'smooth'
        });
        this.urlInput.blur();
        this.setLoading(true);
        this.clearResults();
        try {
            const siteInfo = await this.fetchSiteInfo(url);
            this.displayResults(siteInfo);
            await this.handleAiSummary(siteInfo);
        } catch (error) {
            this.displayError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    async fetchSiteInfo(url) {
        const startTime = Date.now();
        
        try {
            // CORS 우회를 위한 프록시 서비스 사용
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const text = await response.text();
            const responseTime = Date.now() - startTime;

            if (response.status && response.status !== 200) {
                throw new Error(`사이트 접근 실패: HTTP ${response.status}`);
            }

            // HTML 파싱
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const resourceCounts = this.extractResourceCounts(doc, url);
            const countryRank = this.checkCountryRank(url);

            return {
                url: url,
                title: this.extractTitle(doc),
                description: this.extractDescription(doc),
                keywords: this.extractKeywords(doc),
                language: this.extractLanguage(doc),
                encoding: this.extractEncoding(doc),
                statusCode: response.status,
                responseTime: responseTime,
                contentType: response.headers.get('content-type') || 'text/html',
                isHttps: url.startsWith('https://'),
                sslStatus: url.startsWith('https://') ? '활성화' : '비활성화',
                securityHeaders: this.extractSecurityHeadersFromHeaders(response.headers),
                metaTags: this.extractMetaTags(doc),
                
                // 새로 추가된 정보
                favicon: this.extractFavicon(doc, url),
                canonicalUrl: this.extractCanonicalUrl(doc),
                server: response.headers.get('server') || 'No information',
                ogTitle: this.extractMetaProperty(doc, 'og:title'),
                ogType: this.extractMetaProperty(doc, 'og:type'),
                ogImage: this.extractMetaProperty(doc, 'og:image'),
                internalLinks: resourceCounts.internal,
                externalLinks: resourceCounts.external,
                scriptCount: resourceCounts.scripts,
                stylesheetCount: resourceCounts.stylesheets,

                // AI 분석을 위한 추가 정보
                mainContent: this.extractMainContent(doc),

                // 국가별 순위 정보
                country: countryRank.country,
                countryName: countryRank.countryName,
                rankStatus: countryRank.status,
                rankPosition: countryRank.rank,

                // 새로 추가된 정보
                robots: await this.checkUrlExists(url, '/robots.txt'),
                sitemap: await this.checkUrlExists(url, '/sitemap.xml'),
                og: this.extractOpenGraph(doc),
                twitter: this.extractTwitterCard(doc),
            };

        } catch (error) {
            console.error('사이트 정보 요청 실패:', error);
            throw new Error(`사이트 정보를 가져올 수 없습니다: ${error.message}`);
        }
    }

    extractTitle(doc) {
        const title = doc.querySelector('title');
        return title ? title.textContent.trim() : '제목 없음';
    }

    extractDescription(doc) {
        const metaDesc = doc.querySelector('meta[name="description"]');
        if (metaDesc) return metaDesc.getAttribute('content') || 'No description';
        
        const ogDesc = doc.querySelector('meta[property="og:description"]');
        if (ogDesc) return ogDesc.getAttribute('content') || 'No description';
        
        return 'No description';
    }

    extractKeywords(doc) {
        const metaKeywords = doc.querySelector('meta[name="keywords"]');
        return metaKeywords ? metaKeywords.getAttribute('content') || 'No keywords' : 'No keywords';
    }

    extractLanguage(doc) {
        const htmlLang = doc.documentElement.getAttribute('lang');
        if (htmlLang) return htmlLang;
        
        const metaLang = doc.querySelector('meta[http-equiv="content-language"]');
        if (metaLang) return metaLang.getAttribute('content');
        
        return 'No language information';
    }

    extractEncoding(doc) {
        const metaCharset = doc.querySelector('meta[charset]');
        if (metaCharset) return metaCharset.getAttribute('charset');
        
        const metaContentType = doc.querySelector('meta[http-equiv="content-type"]');
        if (metaContentType) {
            const content = metaContentType.getAttribute('content');
            const charsetMatch = content.match(/charset=([^;]+)/);
            if (charsetMatch) return charsetMatch[1];
        }
        
        return 'No encoding information';
    }

    extractSecurityHeaders(status) {
        if (!status) return 'No information';
        
        const headers = [];
        if (status.hsts) headers.push('HSTS');
        if (status.csp) headers.push('CSP');
        if (status.xframe) headers.push('X-Frame-Options');
        
        return headers.length > 0 ? headers.join(', ') : 'No security headers';
    }

    extractSecurityHeadersFromHeaders(headers) {
        const securityHeaders = [];
        if (headers.get('strict-transport-security')) securityHeaders.push('HSTS');
        if (headers.get('content-security-policy')) securityHeaders.push('CSP');
        if (headers.get('x-frame-options')) securityHeaders.push('X-Frame-Options');
        
        return securityHeaders.length > 0 ? securityHeaders.join(', ') : 'No security headers';
    }

    extractMetaProperty(doc, property) {
        const meta = doc.querySelector(`meta[property="${property}"]`);
        return meta ? meta.getAttribute('content') : 'No information';
    }

    extractFavicon(doc, siteUrl) {
        let icon = doc.querySelector('link[rel~="icon"]');
        if (icon && icon.href) return icon.href;
        // fallback: try /favicon.ico
        try {
            const url = new URL(siteUrl);
            return url.origin + '/favicon.ico';
        } catch {
            return null;
        }
    }

    extractCanonicalUrl(doc) {
        const canonicalLink = doc.querySelector('link[rel="canonical"]');
        return canonicalLink ? canonicalLink.getAttribute('href') : 'No information';
    }

    extractResourceCounts(doc, siteUrl) {
        const links = { internal: 0, external: 0, scripts: 0, stylesheets: 0 };
        try {
            const siteHostname = new URL(siteUrl).hostname;
            
            doc.querySelectorAll('a[href]').forEach(a => {
                try {
                    const linkUrl = new URL(a.href, siteUrl);
                    if (linkUrl.hostname === siteHostname) {
                        links.internal++;
                    } else {
                        links.external++;
                    }
                } catch (e) { /* 잘못된 href는 무시 */ }
            });
        } catch(e) { /* 잘못된 siteUrl은 무시 */ }

        links.scripts = doc.querySelectorAll('script').length;
        links.stylesheets = doc.querySelectorAll('link[rel="stylesheet"]').length;
        return links;
    }

    extractMetaTags(doc) {
        const metaTags = doc.querySelectorAll('meta');
        const metaInfo = {};
        
        metaTags.forEach(meta => {
            const name = meta.getAttribute('name') || meta.getAttribute('property');
            const content = meta.getAttribute('content');
            if (name && content) {
                metaInfo[name] = content;
            }
        });
        
        return metaInfo;
    }

    extractMainContent(doc) {
        // Remove irrelevant tags
        doc.querySelectorAll('script, style, nav, footer, header, noscript, svg, img, button, form, input').forEach(el => el.remove());
        
        let content = doc.body.innerText || doc.body.textContent || "";
        
        // Clean up text: remove control chars, carets, collapse whitespace, and trim.
        content = content
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove control characters
            .replace(/\^/g, ' ')                   // Replace carets with spaces
            .replace(/\s\s+/g, ' ')               // Collapse whitespace
            .trim();

        // Attempt to remove simple repetitive phrases that often come from headers/navs
        const words = content.split(' ');
        if (words.length > 20) {
            const phrase1 = words.slice(0, 10).join(' ');
            const phrase2 = words.slice(10, 20).join(' ');
            if (phrase1 === phrase2) {
                content = words.slice(10).join(' ');
            }
        }

        return content.substring(0, 500);
    }

    displayResults(siteInfo) {
        this.statusIndicator.textContent = 'Success';
        this.statusIndicator.className = 'status-indicator success';
        
        // Favicon
        if (siteInfo.favicon && siteInfo.favicon !== 'No information') {
            this.siteFavicon.src = siteInfo.favicon;
            this.siteFavicon.style.display = 'inline-block';
            this.siteFavicon.onerror = () => { this.siteFavicon.style.display = 'none'; };
        } else {
            this.siteFavicon.style.display = 'none';
        }
        this.setText('siteUrl', siteInfo.url);
        this.setText('siteTitle', siteInfo.title);
        this.setText('siteDescription', siteInfo.description);
        this.setText('siteCanonicalUrl', siteInfo.canonicalUrl);
        this.setText('statusCode', siteInfo.statusCode);
        this.setText('responseTime', `${siteInfo.responseTime}ms`);
        this.setText('contentType', siteInfo.contentType);
        this.setText('serverInfo', siteInfo.server);
        this.setText('siteKeywords', siteInfo.keywords);
        this.setText('siteLanguage', siteInfo.language);
        this.setText('siteEncoding', siteInfo.encoding);
        this.setText('isHttps', siteInfo.isHttps ? 'Yes' : 'No');
        this.setText('sslStatus', siteInfo.sslStatus);
        this.setText('securityHeaders', siteInfo.securityHeaders);
        this.setText('ogTitle', siteInfo.ogTitle);
        this.setText('ogType', siteInfo.ogType);
        // OG 이미지
        const ogImage = document.getElementById('ogImage');
        if (siteInfo.ogImage && siteInfo.ogImage !== 'No information') {
            ogImage.src = siteInfo.ogImage;
            ogImage.style.display = 'block';
        } else {
            ogImage.style.display = 'none';
        }
        this.setText('internalLinks', siteInfo.internalLinks);
        this.setText('externalLinks', siteInfo.externalLinks);
        this.setText('scriptCount', siteInfo.scriptCount);
        this.setText('stylesheetCount', siteInfo.stylesheetCount);
        this.setText('selectedCountry', siteInfo.countryName);
        this.setText('rankStatus', siteInfo.rankStatus);
        this.setText('rankPosition', siteInfo.rankPosition);
        this.resultsSection.style.display = 'block';
        this.errorMessage.style.display = 'none';
        if (this.summaryCard) this.summaryCard.style.display = 'none';
    }

    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    displayError(message) {
        this.statusIndicator.textContent = 'Failed';
        this.statusIndicator.className = 'status-indicator error';
        this.errorText.textContent = message;
        this.errorMessage.style.display = 'block';
        this.resultsSection.style.display = 'block';
        this.showToast(message);
    }

    showToast(message) {
        if (!this.toast) return;
        this.toast.textContent = message;
        this.toast.className = 'toast show';
        setTimeout(() => {
            this.toast.className = 'toast';
        }, 2600);
    }

    setLoading(isLoading) {
        const btnText = this.submitBtn.querySelector('.btn-text');
        const spinner = this.submitBtn.querySelector('.loading-spinner');
        btnText.textContent = isLoading ? 'Analyzing...' : 'Analyze';
        spinner.style.display = isLoading ? 'block' : 'none';
        this.submitBtn.disabled = isLoading;
    }

    clearResults() {
        this.resultsSection.style.display = 'none';
        this.errorMessage.style.display = 'none';
        if (this.summaryCard) this.summaryCard.style.display = 'none';
    }

    checkCountryRank(url) {
        const selectedCountry = this.countrySelect.value;
        const selectedCountryName = this.countrySelect.options[this.countrySelect.selectedIndex].text;
        
        let domain = '';
        try {
            domain = new URL(url).hostname.replace(/^www\./, '');
        } catch (e) {
            return { country: selectedCountry, countryName: selectedCountryName, status: 'Domain analysis failed', rank: 'N/A' };
        }

        const rankList = this.sampleTopSites[selectedCountry];
        const rank = rankList.indexOf(domain) + 1;

        if (rank > 0) {
            return { country: selectedCountry, countryName: selectedCountryName, status: 'In list', rank: `#${rank}` };
        } else {
            return { country: selectedCountry, countryName: selectedCountryName, status: 'Not in list', rank: 'N/A' };
        }
    }

    async handleAiSummary(siteInfo) {
        if (!this.summaryCard || !this.summaryContent) return;

        this.summaryCard.style.display = 'block';
        this.summaryContent.classList.add('loading');
        this.summaryContent.textContent = 'Analyzing content...';
        
        try {
            const summaryText = await this.generateAiSummary(siteInfo);
            this.summaryContent.classList.remove('loading');
            this.summaryContent.innerHTML = ''; // Clear for typing
            this.summaryContent.classList.add('typing');
            await this.typeWriter(summaryText, this.summaryContent);
            this.summaryContent.classList.remove('typing');
        } catch (e) {
            this.summaryContent.classList.remove('loading');
            this.summaryContent.textContent = "Could not generate AI summary due to an error.";
        }
    }

    async generateAiSummary(siteInfo) {
        // 사이트 주요 정보 추출
        const { title, description, mainContent } = siteInfo;
        let content = '';
        if (title) content += `Title: ${title}\n`;
        if (description) content += `Description: ${description}\n`;
        if (mainContent) content += `Content: ${mainContent}\n`;
        // Perplexity API 프록시 서버에 요청
        try {
            const summary = await this.fetchAiSummaryFromServer(content);
            return summary;
        } catch (e) {
            return 'AI summary failed: ' + e.message;
        }
    }

    async fetchAiSummaryFromServer(siteContent) {
        // Use relative path for Vercel serverless function in production
        // and localhost for local development
        const apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3001/api/summary' 
            : '/api/summary';
            
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: siteContent })
        });
        
        if (!res.ok) {
            let errorMessage = `Server error: ${res.status} ${res.statusText}`;
            try {
                const errorData = await res.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // If response is not JSON, use the default error message
            }
            throw new Error(errorMessage);
        }
        
        const data = await res.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // 요약이 너무 짧거나 잘린 것 같으면 기본 메시지 추가
        const summary = data.summary || 'No summary available';
        if (summary.length < 50) {
            return summary + '\n\n*Note: This appears to be a shortened response. The full analysis may have been truncated.*';
        }
        
        return summary;
    }

    async typeWriter(text, element) {
        // Simple Markdown to HTML
        const formattedText = text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');

        let speed = 8;
        let speedBoost = 1;
        let lineCount = 0; // 줄바꿈 카운터
        
        // 마우스가 summary 위에 있을 때 5% 가속
        const onMouseEnter = () => { speedBoost = 0.95; };
        const onMouseLeave = () => { speedBoost = 1.05; };
        element.addEventListener('mouseenter', onMouseEnter);
        element.addEventListener('mouseleave', onMouseLeave);

        // AI 요약 카드의 위치를 동적으로 계산하는 함수
        const scrollToAiContent = () => {
            const summaryCard = element.closest('.ai-summary-card');
            if (summaryCard) {
                const rect = summaryCard.getBoundingClientRect();
                const elementTop = rect.top + window.pageYOffset;
                const offset = Math.max(100, window.innerHeight * 0.1); // 화면 상단에서 10% 위치
                
                window.scrollTo({
                    top: elementTop - offset,
                    behavior: 'smooth'
                });
            }
        };

        return new Promise(resolve => {
            let i = 0;
            element.innerHTML = "";
            function type() {
                if (i < formattedText.length) {
                    const char = formattedText[i];
                    if (char === '<') {
                        // HTML 태그 전체를 한 번에 처리
                        const tagEndIndex = formattedText.indexOf('>', i);
                        if (tagEndIndex !== -1) {
                            const tag = formattedText.substring(i, tagEndIndex + 1);
                            element.innerHTML += tag;
                            
                            // <br> 태그가 추가될 때마다 줄바꿈 카운트 증가 및 스크롤
                            if (tag === '<br>') {
                                lineCount++;
                                // 2줄마다 스크롤 (너무 자주 스크롤하지 않도록)
                                if (lineCount % 2 === 0) {
                                    scrollToAiContent();
                                }
                            }
                            
                            i = tagEndIndex + 1; // 태그 끝 다음 위치로 이동
                        } else {
                            // 태그가 제대로 닫히지 않은 경우 단일 문자로 처리
                            element.innerHTML += char;
                            i++;
                        }
                    } else {
                        element.innerHTML += char;
                        i++;
                    }
                    
                    // 첫 번째 스크롤 (AI 요약이 시작될 때)
                    if (i === 1) {
                        scrollToAiContent();
                    }
                    
                    setTimeout(type, speed * speedBoost);
                } else {
                    element.removeEventListener('mouseenter', onMouseEnter);
                    element.removeEventListener('mouseleave', onMouseLeave);
                    
                    // 타이핑 완료 후 최종 스크롤 (전체 내용이 보이도록)
                    setTimeout(() => {
                        scrollToAiContent();
                    }, 300);
                    
                    resolve();
                }
            }
            type();
        });
    }

    async checkUrlExists(siteUrl, path) {
        try {
            const url = new URL(siteUrl);
            const testUrl = url.origin + path;
            const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(testUrl), { method: 'HEAD' });
            return res.ok;
        } catch {
            return false;
        }
    }

    extractOpenGraph(doc) {
        const og = {};
        doc.querySelectorAll('meta[property^="og:"]').forEach(meta => {
            og[meta.getAttribute('property')] = meta.getAttribute('content');
        });
        return og;
    }

    extractTwitterCard(doc) {
        const tw = {};
        doc.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
            tw[meta.getAttribute('name')] = meta.getAttribute('content');
        });
        return tw;
    }

    activateOverlay(active) {
        const overlay = document.querySelector('.sticky-blur-overlay');
        const mainTitle = document.querySelector('.main-title');
        const subTitle = document.querySelector('.subtitle');
        const inputSection = document.querySelector('.input-section');
        if (overlay) overlay.style.opacity = active ? '1' : '1'; // 항상 보이게 유지
        if (mainTitle) mainTitle.classList.toggle('blurred-title', active);
        if (subTitle) subTitle.classList.toggle('blurred-title', active);
        if (inputSection) {
            inputSection.style.transition = 'transform 0.6s cubic-bezier(.4,2,.6,1), box-shadow 0.3s';
            inputSection.style.transform = active ? 'translateY(-80px) scale(1)' : 'translateY(0) scale(1)';
            inputSection.style.zIndex = active ? '10' : '';
            inputSection.style.boxShadow = active ? '0 8px 32px 0 rgba(31,38,135,0.22)' : '';
        }
    }
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    new SiteInfoRequester();
});

// 키보드 단축키 지원 (Ctrl+Enter)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        const form = document.getElementById('urlForm');
        if (form) form.dispatchEvent(new Event('submit'));
    }
});

// Toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';
    setTimeout(() => {
        toast.className = 'toast';
    }, 2600);
}

// Patch error handling to use toast
function showError(message) {
    showToast(message);
    // Optionally, clear the main result area if needed
    const result = document.getElementById('result');
    if (result) result.innerHTML = '';
}

// Replace all previous error displays with showError()
// ... existing code ...
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    // Patch form submit handler to use showError
    const form = document.getElementById('site-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            // ... existing code ...
            try {
                // ... existing code ...
            } catch (err) {
                showError('Unable to fetch site information: ' + err.message);
            }
        });
    }
});
// ... existing code ... 

// Footer logo: 시스템 테마에 따라 로고 이미지 자동 변경
function updateFooterLogoTheme() {
  const logoImgs = document.querySelectorAll('.footer-logo-img');
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  logoImgs.forEach(img => {
    if (isDark) {
      if (img.dataset.dark) img.src = img.dataset.dark;
      if (img.dataset.darkset) img.srcset = img.dataset.darkset;
    } else {
      // 기본 src/srcset 복원 (HTML에 있는 값)
      if (img.getAttribute('data-orig-src')) img.src = img.getAttribute('data-orig-src');
      if (img.getAttribute('data-orig-srcset')) img.srcset = img.getAttribute('data-orig-srcset');
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // 원본 src/srcset 저장
  document.querySelectorAll('.footer-logo-img').forEach(img => {
    img.setAttribute('data-orig-src', img.src);
    img.setAttribute('data-orig-srcset', img.srcset);
  });
  updateFooterLogoTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateFooterLogoTheme);
});

// 인기 사이트 클릭 시 인풋에 URL 입력 (포커스 X)
if (document.querySelector('.all-sites-list')) {
  document.querySelector('.all-sites-list').addEventListener('click', function(e) {
    const a = e.target.closest('.popular-site');
    if (a && a.dataset.url) {
      e.preventDefault();
      const urlInput = document.getElementById('urlInput');
      if (urlInput) {
        urlInput.value = a.dataset.url;
        // focus() 호출하지 않음
      }
    }
  });
} 