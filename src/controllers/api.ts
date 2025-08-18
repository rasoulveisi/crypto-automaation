// =====================================
// ===== API CONTROLLER
// =====================================

import { Logger, Env, TelegramUpdate } from '../types';
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
    await sendTelegram(env, logger, testMessage, env.TELEGRAM_CHAT_ID);
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

// Handle Telegram webhook messages
export async function handleTelegramWebhook(request: Request, env: Env, logger: Logger): Promise<Response> {
  try {
    const update = await request.json() as TelegramUpdate;
    logger.info("Telegram webhook update", { update });

    if (update && update.message && update.message.text && update.message.chat && update.message.chat.id) {
      const chatId = String(update.message.chat.id);
      const messageText = update.message.text.trim().toUpperCase();

      if (messageText.length > 0) {
        // Assuming messageText is the symbol, e.g., "BTC"
        const symbol = messageText;
        logger.info(`Received message from chat ${chatId}: ${messageText}`);

        await sendTelegram(env, logger, `Analyzing ${symbol}-USDT...`, chatId);

        // Trigger analysis for the requested symbol
        const result = await handleRun(env, logger, symbol);

        let replyMessage: string;
        if (result.ok) {
          replyMessage = `✅ Analysis for ${symbol}-USDT completed successfully!\n\n` +
                         `Coins analyzed: ${result.coins.join(', ')}\n` + 
                         `Timestamp: ${new Date().toISOString()}`;
        } else {
          replyMessage = `❌ Analysis for ${symbol}-USDT failed!\n\n` +
                         `Error: ${result.error || 'Unknown error'}\n` +
                         `Timestamp: ${new Date().toISOString()}`;
        }
        await sendTelegram(env, logger, replyMessage, chatId);
      } else {
        logger.info(`Received empty message from chat ${chatId}`);
        await sendTelegram(env, logger, "Please send a cryptocurrency symbol (e.g., BTC, ETH) to analyze.", chatId);
      }
    }
    
    // Always return a 200 OK to Telegram to avoid repeated deliveries
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    logger.error("Telegram webhook failed", { error: String(err) });
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
