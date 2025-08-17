// =====================================
// ===== LOGGER UTILITY
// =====================================

import { LogLevel, Logger } from '../types';

export const createLogger = (level: LogLevel = "info", traceId?: string): Logger => {
  const threshold: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
  const current = threshold[level];

  const log = (lvl: LogLevel, msg: string, data?: any) => {
    if (threshold[lvl] < current) return;
    const payload = {
      ts: new Date().toISOString(),
      level: lvl,
      service: "crypto-worker",
      trace_id: traceId,
      message: msg,
      ...(data ? { data } : {}),
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  };

  return {
    debug: (m, d) => log("debug", m, d),
    info:  (m, d) => log("info", m, d),
    warn:  (m, d) => log("warn", m, d),
    error: (m, d) => log("error", m, d),
  };
};
