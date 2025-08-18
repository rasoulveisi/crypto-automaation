// =====================================
// ===== TELEGRAM BOT SERVICE
// =====================================

import { Logger, Env } from '../types';
import { TELEGRAM_PARSE_MODE, TELEGRAM_MAX_MESSAGE } from '../config/constants';
import { fetchWithRetryEnhanced, sleep } from '../utils/http';
import { chunkForTelegram } from '../utils/helpers';

// Send message to Telegram
export async function sendTelegram(env: Env, logger: Logger, html: string, chatId: string): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;

  logger.info("Sending Telegram message", { 
    tokenLength: token.length, 
    chatId, 
    messageLength: html.length 
  });

  const chunks = chunkForTelegram(html, TELEGRAM_MAX_MESSAGE);
  for (const [idx, part] of chunks.entries()) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = new URLSearchParams({
      chat_id: chatId,
      text: part,
      parse_mode: TELEGRAM_PARSE_MODE,
      disable_web_page_preview: "true",
    });
    
    try {
      const response = await fetchWithRetryEnhanced(
        url, 
        { method: "POST", body }, 
        logger, 
        3, 
        700
      );
      const responseText = await response.text();
      logger.info("Telegram message sent successfully", { 
        part: idx + 1, 
        total: chunks.length, 
        responseStatus: response.status,
        responseText: responseText.substring(0, 200) // Log first 200 chars of response
      });
    } catch (error) {
      logger.error("Failed to send Telegram message", { 
        part: idx + 1, 
        total: chunks.length, 
        error: String(error) 
      });
      throw error; // Re-throw to stop processing
    }
    
    await sleep(250); // be polite
  }
}
