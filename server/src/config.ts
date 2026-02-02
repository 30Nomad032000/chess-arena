function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  PORT: parseInt(optionalEnv("PORT", "3001"), 10),
  ENGINE_URL: optionalEnv("ENGINE_URL", "http://localhost:8080"),
  DATABASE_URL: requiredEnv("DATABASE_URL"),
  REDIS_URL: requiredEnv("REDIS_URL"),
} as const;
