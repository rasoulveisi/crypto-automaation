// =====================================
// ===== ANALYSIS CONTROLLER
// =====================================

import { Logger, Env, SentimentJSON, AnalysisInput } from '../types';
import { PAIRS_SUFFIX, DEFAULT_MODEL } from '../config/constants';
import { buildSymbolList } from '../utils/helpers';
import { sleep } from '../utils/http';
import { fetchCryptoNews } from '../services/news';
import { fetchAllTimeframes } from '../services/crypto-candles';
import { 
  geminiCompletionJSON, 
  geminiCompletionText, 
  buildSentimentPrompt, 
  buildAgentInstruction 
} from '../services/gemini';
import { sendTelegram } from '../services/telegram';

// Send error message to Telegram
async function sendErrorMessage(env: Env, logger: Logger, errorType: string, error: string, details?: any): Promise<void> {
  const errorMessage = `🚨 <b>Crypto Analysis Error</b>\n\n` +
    `<b>Error Type:</b> ${errorType}\n` +
    `<b>Error:</b> ${error}\n` +
    `<b>Time:</b> ${new Date().toISOString()}\n` +
    (details ? `\n<b>Details:</b>\n<code>${JSON.stringify(details, null, 2)}</code>` : '');
  
  try {
    await sendTelegram(env, logger, errorMessage);
    logger.info("Error message sent to Telegram", { errorType, error });
  } catch (telegramError) {
    logger.error("Failed to send error message to Telegram", { 
      originalError: error, 
      telegramError: String(telegramError) 
    });
  }
}

// Analyze a single coin
export async function analyzeCoin(
  env: Env, 
  logger: Logger, 
  coin: string, 
  sentiment: SentimentJSON
): Promise<void> {
  const symbol = `${coin}${PAIRS_SUFFIX}`;
  logger.info("Fetching candles", { symbol });
  
  try {
    const perCoin = await fetchAllTimeframes(symbol, logger);

    const input: AnalysisInput = {
      symbol,
      allCandles: perCoin.allCandles,
      sentiment,
    };

    const model = env.GEMINI_MODEL_AGENT || DEFAULT_MODEL;
    const { system, user } = buildAgentInstruction(symbol, input);

    logger.debug("Calling AI Agent model", { model, symbol });
    const content = await geminiCompletionText(env, logger, system, user);

    // Ship to Telegram
    await sendTelegram(env, logger, content);
  } catch (error) {
    logger.error("Coin analysis failed", { coin, error: String(error) });
    await sendErrorMessage(env, logger, "Crypto Data Error", `Failed to analyze ${coin}`, {
      coin,
      error: String(error),
      symbol
    });
    throw error; // Re-throw to stop processing
  }
}

// Main analysis workflow
export async function handleRun(env: Env, logger: Logger): Promise<{ ok: boolean; coins: string[]; error?: string }> {
  try {
    // 1) Fetch & filter news
    logger.info("Fetching crypto news");
    let news;
    try {
      news = await fetchCryptoNews(env, logger);
    } catch (error) {
      logger.error("News fetching failed", { error: String(error) });
      await sendErrorMessage(env, logger, "News API Error", "Failed to fetch crypto news", {
        error: String(error),
        service: "TheNewsAPI"
      });
      throw error;
    }

    // 2) Sentiment JSON (global market sentiment used for each coin)
    const model = env.GEMINI_MODEL_SENTIMENT || DEFAULT_MODEL;
    const sentPrompt = buildSentimentPrompt(news);
    logger.debug("Calling Sentiment model", { model, articleCount: news.length });

    let sentimentRaw: string;
    try {
      sentimentRaw = await geminiCompletionJSON(env, logger, sentPrompt.system, sentPrompt.user);
    } catch (error) {
      logger.error("Sentiment analysis failed", { error: String(error) });
      await sendErrorMessage(env, logger, "AI Sentiment Error", "Failed to analyze news sentiment", {
        error: String(error),
        service: "Google Gemini AI",
        articleCount: news.length
      });
      throw error;
    }

    let sentiment: SentimentJSON;
    try {
      sentiment = JSON.parse(sentimentRaw) as SentimentJSON;
    } catch (e) {
      logger.error("Sentiment parse failed", { raw: sentimentRaw, error: String(e) });
      await sendErrorMessage(env, logger, "AI Response Error", "Failed to parse sentiment analysis", {
        error: String(e),
        rawResponse: sentimentRaw.substring(0, 200) + "...",
        service: "Google Gemini AI"
      });
      throw new Error(`Failed to parse sentiment response: ${e}`);
    }

    // 3) For each coin: fetch candles and run AI agent
    const coins = buildSymbolList(env);
    logger.info("Analyzing coins", { coins });

    const successfulCoins: string[] = [];
    const failedCoins: string[] = [];

    // Sequential per coin to stay within rate limits & stay predictable
    for (const coin of coins) {
      try {
        await analyzeCoin(env, logger, coin, sentiment);
        successfulCoins.push(coin);
        await sleep(600); // stagger model calls a bit
      } catch (err) {
        logger.error("Per-coin analysis failed", { coin, error: String(err) });
        failedCoins.push(coin);
        // Continue with other coins even if one fails
      }
    }

    // Send summary to Telegram
    if (successfulCoins.length > 0) {
      const summaryMessage = `✅ <b>Analysis Complete</b>\n\n` +
        `<b>Successfully analyzed:</b> ${successfulCoins.join(', ')}\n` +
        `<b>Total coins:</b> ${coins.length}\n` +
        `<b>Successful:</b> ${successfulCoins.length}\n` +
        `<b>Failed:</b> ${failedCoins.length}\n` +
        `<b>Time:</b> ${new Date().toISOString()}`;
      
      await sendTelegram(env, logger, summaryMessage);
    }

    if (failedCoins.length > 0) {
      return { 
        ok: false, 
        coins: successfulCoins, 
        error: `Failed to analyze: ${failedCoins.join(', ')}` 
      };
    }

    return { ok: true, coins: successfulCoins };
  } catch (error) {
    logger.error("Main analysis workflow failed", { error: String(error) });
    await sendErrorMessage(env, logger, "System Error", "Crypto analysis workflow failed", {
      error: String(error),
      timestamp: new Date().toISOString()
    });
    
    return { 
      ok: false, 
      coins: [], 
      error: String(error) 
    };
  }
}
