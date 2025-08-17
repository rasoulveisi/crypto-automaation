// =====================================
// ===== KUCOIN CRYPTO DATA SERVICE
// =====================================

import { Logger, TimeframeCandles, KuCoinCandle, TIMEFRAMES, KuCoinKlineRaw } from '../types';
import { 
  LAST_N_TO_KEEP, 
  KUCOIN_BASE_URL_FULL,
  KUCOIN_REQUEST_DELAY_MS
} from '../config/constants';
import { fetchWithRetryEnhanced, sleep } from '../utils/http';

// Fetch klines from KuCoin API
export async function fetchKlines(
  symbol: string, 
  tf: (typeof TIMEFRAMES)[number], 
  logger: Logger
): Promise<TimeframeCandles> {
  // Convert symbol format (BTCUSDT -> BTC-USDT)
  const kucoinSymbol = symbol.replace('USDT', '-USDT');
  
  const kucoinType = tf.kucoinType;
  const url = `${KUCOIN_BASE_URL_FULL}/api/v1/market/candles?symbol=${encodeURIComponent(kucoinSymbol)}&type=${kucoinType}`;
  
  logger.debug(`Fetching from KuCoin API`, { symbol, kucoinSymbol, kucoinType, url });
  
  const res = await fetchWithRetryEnhanced(
    url,
    {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CryptoBot/1.0)",
        "Accept": "application/json"
      }
    },
    logger,
    3,
    500
  );
  
  const response = await res.json() as { code: string; data: KuCoinKlineRaw[] };
  
  if (response.code !== '200000') {
    throw new Error(`KuCoin API error: ${response.code}`);
  }
  
  if (!response.data || response.data.length === 0) {
    throw new Error(`No data received from KuCoin for ${symbol} ${tf.id}`);
  }
  
  // Convert to simplified KuCoin format (no unnecessary conversion)
  const converted: KuCoinCandle[] = response.data.slice(-LAST_N_TO_KEEP).map(([timestamp, open, close, high, low, volume, amount]) => ({
    timestamp: parseInt(timestamp) * 1000,  // Convert seconds to milliseconds
    open,
    high,
    low,
    close,
    volume,
    amount
  }));
  
  logger.info(`Successfully fetched from KuCoin`, { symbol, timeframe: tf.id, count: converted.length });
  return { timeframe: tf.id, candles: converted };
}

// Fetch all timeframes for a coin
export async function fetchAllTimeframes(
  symbol: string, 
  logger: Logger
): Promise<{ symbol: string; allCandles: TimeframeCandles[] }> {
  logger.info(`Starting to fetch all timeframes for ${symbol}`);
  
  const allCandles: TimeframeCandles[] = [];
  
  for (const tf of TIMEFRAMES) {
    try {
      const timeframeData = await fetchKlines(symbol, tf, logger);
      allCandles.push(timeframeData);
      
      logger.debug(`Completed timeframe ${tf.id} for ${symbol}`, { 
        symbol, 
        timeframe: tf.id, 
        candlesCount: timeframeData.candles.length 
      });
      
      // Add delay between requests to be polite to KuCoin
      await sleep(KUCOIN_REQUEST_DELAY_MS);
    } catch (error) {
      logger.error(`Failed to fetch timeframe ${tf.id} for ${symbol}`, { 
        symbol, 
        timeframe: tf.id, 
        error: String(error) 
      });
      
      // Re-throw the error to stop processing - no fallbacks
      throw error;
    }
  }
  
  logger.info(`Completed fetching all timeframes for ${symbol}`, { 
    symbol, 
    totalTimeframes: allCandles.length,
    timeframes: allCandles.map(tc => tc.timeframe)
  });
  
  return { symbol, allCandles };
}
