// Vercel Serverless Function for AI Summary
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content } = req.body;
  
  // 요청 본문 검증
  if (!content) {
    return res.status(400).json({ 
      error: 'Content is required in request body' 
    });
  }
  
  // API 키 확인
  if (!process.env.PERPLEXITY_API_KEY) {
    console.error('PERPLEXITY_API_KEY not found in environment variables');
    return res.status(500).json({ 
      error: 'AI service configuration error. Please contact administrator.' 
    });
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
      const errorText = await response.text();
      console.error(`Perplexity API Error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected API response format:', data);
      throw new Error('Invalid response format from AI service');
    }
    
    const summary = data.choices[0].message.content || 'Summary could not be generated.';
    
    res.status(200).json({ summary });
  } catch (err) {
    console.error('AI Summary Error:', {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      error: `AI Summary failed: ${err.message}` 
    });
  }
} 