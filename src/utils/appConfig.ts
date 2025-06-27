import dotenv from "dotenv";
import { AppConfig } from "../interface/interface";
dotenv.config();

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable ${name} is required`);
    }
    return value;
}

function requireNumberEnv(name: string): number {
    const value = requireEnv(name);
    const num = Number(value);
    if (isNaN(num)) {
        throw new Error(`Environment variable ${name} must be number`);
    }
    return num;
}

export const appConfig: AppConfig = {
    minBetAmount: requireNumberEnv("MIN_BET_AMOUNT"),
    maxBetAmount: requireNumberEnv("MAX_BET_AMOUNT"),
    dbConfig: {
        host: requireEnv("DB_HOST"),
        user: requireEnv("DB_USER"),
        password: requireEnv("DB_PASSWORD"),
        database: requireEnv("DB_NAME"),
        port: requireEnv("DB_PORT"),
        retries: requireEnv("DB_MAX_RETRIES"),
        interval: requireEnv("DB_RETRY_INTERVAL")
    },
    redis: {
        host: requireEnv("REDIS_HOST"),
        port: requireNumberEnv("REDIS_PORT"),
        retry: requireNumberEnv("REDIS_RETRY"),
        interval: requireNumberEnv("REDIS_RETRY_INTERVAL")
    }
}