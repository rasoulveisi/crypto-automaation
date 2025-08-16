export interface Env {
  GEMINI_API_KEY: string;
  NEWSAPI_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ 
        ok: true, 
        service: "crypto-worker",
        env: {
          hasGeminiKey: !!env.GEMINI_API_KEY,
          hasNewsKey: !!env.NEWSAPI_KEY,
          hasTelegramToken: !!env.TELEGRAM_BOT_TOKEN,
          hasTelegramChatId: !!env.TELEGRAM_CHAT_ID
        }
      }), {
        headers: { "content-type": "application/json" },
      });
    }
    
    if (url.pathname === "/test") {
      try {
        // Test Gemini API
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
        const geminiReq = {
          contents: [{
            parts: [{ text: "Hello, this is a test. Please respond with 'Test successful'." }]
          }],
          generationConfig: {
            temperature: 0.0
          }
        };
        
        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiReq),
        });
        
        if (!geminiRes.ok) {
          throw new Error(`Gemini API error: ${geminiRes.status} ${geminiRes.statusText}`);
        }
        
        const geminiData = await geminiRes.json();
        const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
        
        return new Response(JSON.stringify({ 
          ok: true, 
          geminiTest: "successful",
          geminiResponse: geminiText
        }), {
          headers: { "content-type": "application/json" },
        });
        
      } catch (error) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: String(error),
          geminiTest: "failed"
        }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }
    
    return new Response("OK", { status: 200 });
  },
};
