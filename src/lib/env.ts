import { z } from "zod";

/**
 * Environment variable validation — fail fast at startup if required config is
 * missing or malformed.  Import this module from the top-level layout or an
 * instrumentation hook so that invalid deployments surface immediately.
 */

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url().optional(),

  // LINE Login — optional
  LINE_CHANNEL_ID: z.string().optional(),
  LINE_CHANNEL_SECRET: z.string().optional(),

  // Stripe — optional in dev, required in production
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(
      `[env] Invalid environment variables:\n${formatted}`,
    );
    throw new Error("Invalid environment variables — see logs above");
  }
  return result.data;
}

/** Validated environment — accessing this guarantees required vars exist. */
export const env = validateEnv();
