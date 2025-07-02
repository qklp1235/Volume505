require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.perplexity.ai", "https://api.allorigins.win"]
    }
  }
}));

// Compression middleware
app.use(compression());

// CORS configuration for domain
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['https://www.volume505.com', 'https://volume505.com', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, './')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    domain: process.env.DOMAIN || 'www.volume505.com',
    timestamp: new Date().toISOString()
  });
});

// API endpoint for website analysis
app.post('/api/summary', async (req, res) => {
  const { content, apiKey, model, temperature } = req.body;
  
  // 클라이언트에서 제공한 API 키를 우선 사용, 없으면 환경변수 사용
  const perplexityApiKey = apiKey || process.env.PERPLEXITY_API_KEY;
  
  if (!perplexityApiKey) {
    return res.status(400).json({ 
      error: 'API key is required. Please set your Perplexity API key in the settings.' 
    });
  }
  
  // 사용자 설정값 또는 기본값 사용
  const selectedModel = model || 'llama-3.1-sonar-small-128k-online';
  const selectedTemperature = temperature !== undefined ? temperature : 0.1;
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful website analyzer. Provide a detailed but concise summary of the website content in Korean. Include key features, content overview, and recent updates if available. Format your response with clear sections using markdown.' 
          },
          { 
            role: 'user', 
            content: `다음 웹사이트 정보를 분석하고 상세하게 요약해주세요:\n\n${content}` 
          }
        ],
        max_tokens: 800,
        temperature: selectedTemperature,
        stream: false
      })
    });
    
    if (!response.ok) {
      let errorMessage = `Perplexity API error: ${response.status} ${response.statusText}`;
      
      // API 응답에서 더 자세한 오류 정보 추출
      try {
        const errorData = await response.json();
        if (errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        // JSON 파싱 실패 시 기본 오류 메시지 사용
      }
      
      // 일반적인 오류 상황에 대한 사용자 친화적 메시지
      if (response.status === 401) {
        errorMessage = 'API 키가 유효하지 않습니다. 설정에서 올바른 API 키를 입력해주세요.';
      } else if (response.status === 429) {
        errorMessage = 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (response.status === 403) {
        errorMessage = 'API 키 권한이 부족합니다. 계정 설정을 확인해주세요.';
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'Summary could not be generated.';
    
    res.json({ summary });
  } catch (err) {
    console.error('Perplexity API Error:', err);
    res.status(500).json({ 
      error: err.message || 'AI Summary failed. Please check your API key and try again.' 
    });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3001;
const DOMAIN = process.env.DOMAIN || 'www.volume505.com';

app.listen(PORT, () => {
  console.log(`🚀 Volume505 Site Info server running on port ${PORT}`);
  console.log(`🌐 Domain: ${DOMAIN}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 