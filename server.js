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
  const { content } = req.body;
  
  // API 키 확인
  if (!process.env.PERPLEXITY_API_KEY) {
    return res.status(500).json({ error: 'Perplexity API key not found. Please set PERPLEXITY_API_KEY in .env file.' });
  }
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
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
        temperature: 0.1,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'Summary could not be generated.';
    res.json({ summary });
  } catch (err) {
    console.error('Perplexity API Error:', err);
    res.status(500).json({ error: `AI Summary failed: ${err.message}` });
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