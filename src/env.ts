function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  token: requireEnv("WHATSAPP_TOKEN"),
  phoneNumberId: requireEnv("WHATSAPP_PHONE_NUMBER_ID"),
  verifyToken: requireEnv("WHATSAPP_VERIFY_TOKEN"),
  mongoUri: requireEnv("MONGODB_URI"),
  port: Number(process.env.PORT ?? 3000),
};
