import { z } from "zod";
import { Logger } from "../utils/logger";

const logger = new Logger("Config:Env");

// Schema for environment variables
const envSchema = z.object({
  NODE_ENV: z.string(),
  DEEPGRAM_API_KEY: z.string(),
  OPENAI_API_KEY: z.string(),
  BROWSERBASE_PROJECT_ID: z.string(),
  BROWSERBASE_API_KEY: z.string(),
});

// Function to validate environment variables
const validateEnv = () => {
  try {
    logger.info("Validating environment variables");
    const env = {
      NODE_ENV: process.env.NODE_ENV,
      DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      BROWSERBASE_PROJECT_ID: process.env.BROWSERBASE_PROJECT_ID,
      BROWSERBASE_API_KEY: process.env.BROWSERBASE_API_KEY,
    };
    const parsed = envSchema.parse(env);
    logger.info("Environment variables validated successfully");
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err: any) => err.path.join("."));
      logger.error("Invalid environment variables", { error: { missingVars } });
      throw new Error(
        `❌ Invalid environment variables: ${missingVars.join(
          ", "
        )}. Please check your .env file`
      );
    }
    throw error;
  }
};

export const env = validateEnv();
