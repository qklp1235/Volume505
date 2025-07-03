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
  const { content, apiKey, model, temperature, aiService } = req.body;
  
  // 클라이언트에서 제공한 API 키를 우선 사용, 없으면 환경변수 사용
  const apiKeyToUse = apiKey || process.env.PERPLEXITY_API_KEY;
  
  if (!apiKeyToUse) {
    return res.status(400).json({ 
      error: 'API key is required. Please set your AI API key in the settings.' 
    });
  }
  
  // 사용자 설정값 또는 기본값 사용
  const selectedModel = model || 'gpt-4o';
  const selectedTemperature = temperature !== undefined ? temperature : 0.1;
  const selectedService = aiService || 'openai';
  
  try {
    let summary;
    
    switch (selectedService) {
      case 'openai':
        summary = await callOpenAI(apiKeyToUse, selectedModel, content, selectedTemperature);
        break;
      case 'claude':
        summary = await callClaude(apiKeyToUse, selectedModel, content, selectedTemperature);
        break;
      case 'perplexity':
        summary = await callPerplexity(apiKeyToUse, selectedModel, content, selectedTemperature);
        break;
      case 'gemini':
        summary = await callGemini(apiKeyToUse, selectedModel, content, selectedTemperature);
        break;
      case 'cohere':
        summary = await callCohere(apiKeyToUse, selectedModel, content, selectedTemperature);
        break;
      default:
        throw new Error('지원하지 않는 AI 서비스입니다.');
    }
    
    res.json({ summary });
  } catch (err) {
    console.error('AI API Error:', err);
    res.status(500).json({ 
      error: err.message || 'AI Summary failed. Please check your API key and try again.' 
    });
  }
});

// OpenAI API 호출
async function callOpenAI(apiKey, model, content, temperature) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
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
      temperature: temperature
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(getErrorMessage(response.status, 'OpenAI', errorData));
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Summary could not be generated.';
}

// Claude API 호출
async function callClaude(apiKey, model, content, temperature) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 800,
      temperature: temperature,
      messages: [
        {
          role: 'user',
          content: `You are a helpful website analyzer. Provide a detailed but concise summary of the website content in Korean. Include key features, content overview, and recent updates if available. Format your response with clear sections using markdown.

다음 웹사이트 정보를 분석하고 상세하게 요약해주세요:

${content}`
        }
      ]
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(getErrorMessage(response.status, 'Claude', errorData));
  }
  
  const data = await response.json();
  return data.content?.[0]?.text || 'Summary could not be generated.';
}

// Perplexity API 호출 (기존 코드 유지)
async function callPerplexity(apiKey, model, content, temperature) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
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
      temperature: temperature,
      stream: false
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(getErrorMessage(response.status, 'Perplexity', errorData));
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Summary could not be generated.';
}

// Gemini API 호출
async function callGemini(apiKey, model, content, temperature) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are a helpful website analyzer. Provide a detailed but concise summary of the website content in Korean. Include key features, content overview, and recent updates if available. Format your response with clear sections using markdown.

다음 웹사이트 정보를 분석하고 상세하게 요약해주세요:

${content}`
        }]
      }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 800
      }
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(getErrorMessage(response.status, 'Gemini', errorData));
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Summary could not be generated.';
}

// Cohere API 호출
async function callCohere(apiKey, model, content, temperature) {
  const response = await fetch('https://api.cohere.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      prompt: `You are a helpful website analyzer. Provide a detailed but concise summary of the website content in Korean. Include key features, content overview, and recent updates if available. Format your response with clear sections using markdown.

다음 웹사이트 정보를 분석하고 상세하게 요약해주세요:

${content}

요약:`,
      max_tokens: 800,
      temperature: temperature
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(getErrorMessage(response.status, 'Cohere', errorData));
  }
  
  const data = await response.json();
  return data.generations?.[0]?.text || 'Summary could not be generated.';
}

// 에러 메시지 생성 함수
function getErrorMessage(status, service, errorData) {
  const baseMessage = errorData.error?.message || errorData.message || `${service} API error: ${status}`;
  
  if (status === 401) {
    return `API 키가 유효하지 않습니다. ${service} 설정에서 올바른 API 키를 입력해주세요.`;
  } else if (status === 429) {
    return `API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.`;
  } else if (status === 403) {
    return `API 키 권한이 부족합니다. ${service} 계정 설정을 확인해주세요.`;
  }
  
  return baseMessage;
}

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