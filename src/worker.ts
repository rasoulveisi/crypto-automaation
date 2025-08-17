// =====================================
// ===== MINIMAL WORKER FILE
// ===== Purpose: Basic crypto automation worker
// =====================================

/// <reference types="@cloudflare/workers-types" />

import { createLogger } from './utils/logger';
import { handleManualRun, handleTestTelegram, handleHealth } from './controllers/api';

interface Env {
  GEMINI_API_KEY: string;
  THENEWSAPI_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  MAX_ARTICLES?: string;
  SYMBOLS?: string;
  LOG_LEVEL?: string;
}

export default {
  // HTTP endpoint handler
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const logger = createLogger(env.LOG_LEVEL as any || "info");
    
    logger.info(`Request: ${request.method} ${url.pathname}`);

    // Health check endpoint
    if (url.pathname === "/health") {
      return await handleHealth();
    }
    
    // Test telegram endpoint
    if (url.pathname === "/test-telegram" && request.method === "POST") {
      return await handleTestTelegram(env, logger);
    }
    
    // Manual run endpoint
    if (url.pathname === "/run" && request.method === "POST") {
      return await handleManualRun(env, logger);
    }

    // Default response
    return new Response(JSON.stringify({ 
      message: "Crypto Automation Worker",
      endpoints: {
        health: "GET /health",
        testTelegram: "POST /test-telegram", 
        manualRun: "POST /run"
      }
    }), {
      headers: { "content-type": "application/json" },
    });
  },

  // Scheduled Cron Trigger
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const logger = createLogger(env.LOG_LEVEL as any || "info");
    logger.info("Scheduled run triggered at:", { timestamp: new Date().toISOString() });
    
    try {
      // Import and execute the full analysis workflow
      const { handleRun } = await import('./controllers/analysis');
      const result = await handleRun(env, logger);
      
      if (result.ok) {
        logger.info("Scheduled analysis completed successfully", { 
          coins: result.coins,
          successfulCount: result.coins.length 
        });
      } else {
        logger.warn("Scheduled analysis completed with errors", { 
          coins: result.coins,
          error: result.error,
          successfulCount: result.coins.length 
        });
      }
    } catch (error) {
      logger.error("Scheduled analysis failed", { error: String(error) });
    }
  },
};
