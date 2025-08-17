// =====================================
// ===== HTTP UTILITIES
// =====================================

import { Logger } from '../types';

// Utility function for sleeping
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Circuit Breaker implementation
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// Rate limiter for API calls
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      if (waitTime > 0) {
        await sleep(waitTime);
      }
    }
    
    this.requests.push(now);
  }
}

// Enhanced fetchWithRetry with better error handling and exponential backoff
export async function fetchWithRetryEnhanced(
  input: any, 
  init: any, 
  logger: Logger, 
  attempts = 3, 
  backoffMs = 500
) {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(input, init);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      logger.warn(`fetchWithRetry attempt ${i + 1} failed`, { 
        error: String(err), 
        attempt: i + 1,
        maxAttempts: attempts 
      });
      if (i < attempts - 1) {
        const delay = backoffMs * Math.pow(2, i); // Exponential backoff
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}
