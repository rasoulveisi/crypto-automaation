// =====================================
// ===== API CONTROLLER
// =====================================

import { Logger, Env } from '../types';
import { handleRun } from './analysis';
import { sendTelegram } from '../services/telegram';

// Health check endpoint
export async function handleHealth(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, service: "crypto-worker" }), {
    headers: { "content-type": "application/json" },
  });
}

// Test Telegram endpoint
export async function handleTestTelegram(env: Env, logger: Logger): Promise<Response> {
  try {
    const testMessage = `🧪 <b>Test Message</b>\n\nThis is a test message from your crypto automation worker.\n\nTime: ${new Date().toISOString()}`;
    await sendTelegram(env, logger, testMessage);
    return new Response(JSON.stringify({ ok: true, message: "Test message sent" }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    logger.error("Telegram test failed", { error: String(err) });
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}

// Manual run endpoint
export async function handleManualRun(env: Env, logger: Logger): Promise<Response> {
  try {
    const result = await handleRun(env, logger);
    
    if (result.ok) {
      return new Response(JSON.stringify({
        ok: true,
        message: "Analysis completed successfully",
        coins: result.coins,
        timestamp: new Date().toISOString()
      }), {
        headers: { "content-type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({
        ok: false,
        message: "Analysis completed with errors",
        coins: result.coins,
        error: result.error,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  } catch (err) {
    logger.error("Manual run failed", { error: String(err) });
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(err),
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
