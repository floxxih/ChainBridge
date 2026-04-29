const LEVELS = ["debug", "info", "error"] as const;

type LogLevel = (typeof LEVELS)[number];

type Meta = Record<string, any>;

function redact(data: Meta): Meta {
  if (!data) return data;
  const clone = { ...data };
  if (clone.privateKey) clone.privateKey = "***";
  return clone;
}

export function log(level: LogLevel, message: string, meta: Meta = {}) {
  if (process.env.NODE_ENV === "production" && level === "debug") return;
  const safeMeta = redact(meta);
  if (LEVELS.includes(level)) {
    // @ts-ignore
    console[level](`[${level}]`, message, safeMeta);
  } else {
    console.info(`[info]`, message, safeMeta);
  }
}
