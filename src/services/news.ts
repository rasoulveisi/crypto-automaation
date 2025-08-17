// =====================================
// ===== NEWS API SERVICE
// =====================================

import { Logger, NewsArticle, TheNewsAPIResponse, Env } from '../types';
import { fetchWithRetryEnhanced } from '../utils/http';
import { maxArticles } from '../utils/helpers';

// Fetch crypto news using TheNewsAPI
export async function fetchCryptoNews(env: Env, logger: Logger): Promise<NewsArticle[]> {
  logger.debug("Fetching crypto news from TheNewsAPI");
  
  const params = new URLSearchParams({
    api_token: env.THENEWSAPI_KEY,
    search: "crypto OR bitcoin OR ethereum OR blockchain",
    search_fields: "title,description,keywords",
    categories: "business,tech",
    language: "en",
    sort: "published_at",
    limit: String(Math.min(maxArticles(env) * 2, 100)),
  });

  const url = `https://api.thenewsapi.com/v1/news/all?${params.toString()}`;
  const res = await fetchWithRetryEnhanced(
    url, 
    { 
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    }, 
    logger, 
    3, 
    500
  );
  
  const json = (await res.json()) as TheNewsAPIResponse;
  const allArticles = json?.data || [];
  
  logger.info("Successfully fetched news from TheNewsAPI", { totalCount: allArticles.length });
  
  // Filter for crypto-related articles
  const cryptoArticles = allArticles.filter(article => {
    const title = (article.title || "").toLowerCase();
    const description = (article.description || "").toLowerCase();
    const keywords = (article.keywords || "").toLowerCase();
    
    return title.includes('crypto') || title.includes('bitcoin') || title.includes('ethereum') ||
           title.includes('blockchain') || title.includes('defi') || title.includes('nft') ||
           description.includes('crypto') || description.includes('bitcoin') || description.includes('ethereum') ||
           keywords.includes('crypto') || keywords.includes('bitcoin') || keywords.includes('ethereum');
  });
  
  logger.info("Filtered crypto-related articles", { cryptoCount: cryptoArticles.length });
  
  // If we don't have enough crypto articles, include some general business/finance articles
  let articles = cryptoArticles;
  if (articles.length < 5) {
    const businessArticles = allArticles.filter(article => {
      const title = (article.title || "").toLowerCase();
      const description = (article.description || "").toLowerCase();
      return title.includes('market') || title.includes('stock') || title.includes('finance') ||
             title.includes('economy') || title.includes('trading') ||
             description.includes('market') || description.includes('stock') || description.includes('finance');
    });
    
    // Combine crypto and business articles, prioritizing crypto
    articles = [...cryptoArticles, ...businessArticles.slice(0, 10)];
    logger.info("Added business articles due to insufficient crypto news", { 
      cryptoCount: cryptoArticles.length, 
      businessCount: businessArticles.length,
      totalCount: articles.length 
    });
  }

  // Deduplicate by title/url and drop empty titles
  const seen = new Set<string>();
  const cleaned: NewsArticle[] = [];
  for (const a of articles) {
    const key = (a.title || a.url || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(a);
  }
  
  const result = cleaned.slice(0, maxArticles(env));
  logger.info("Final news articles for sentiment analysis", { count: result.length });
  
  if (result.length === 0) {
    throw new Error("No news articles found for sentiment analysis");
  }
  
  return result;
}
