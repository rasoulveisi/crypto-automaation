// =====================================
// ===== UTILITY HELPERS
// =====================================

import { Env } from '../types';
import { DEFAULT_SYMBOLS, TIMEFRAME_MS } from '../config/constants';

// HTML utilities
export function joinHtmlLines(lines: string[]): string {
  return lines.join("\n");
}

export function chunkForTelegram(html: string, maxLength: number): string[] {
  if (html.length <= maxLength) return [html];
  const chunks: string[] = [];
  let start = 0;
  while (start < html.length) {
    let end = Math.min(start + maxLength, html.length);
    // Try to split at a line break to avoid cutting tags
    const lastBreak = html.lastIndexOf("\n", end);
    if (lastBreak > start + 200) end = lastBreak;
    chunks.push(html.slice(start, end));
    start = end;
  }
  return chunks;
}

// Date formatting
export function formatDateForHeader(d = new Date()): string {
  // n8n template said: "format the date as mm/dd/yyyy at xx:xxpm"
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  const min = `${d.getMinutes()}`.padStart(2, "0");
  return `${mm}/${dd}/${yyyy} at ${h}:${min}${ampm}`;
}

// Configuration helpers
export function buildSymbolList(env: Env): string[] {
  if (env.SYMBOLS) {
    const arr = env.SYMBOLS.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    return arr.length ? arr : DEFAULT_SYMBOLS;
  }
  return DEFAULT_SYMBOLS;
}

export function maxArticles(env: Env): number {
  const n = parseInt(env.MAX_ARTICLES || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 25;
}