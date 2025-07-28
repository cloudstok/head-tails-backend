import Redis from "ioredis";
import type { RedisOptions, Redis as RedisClient } from "ioredis";
import dotenv from "dotenv";
import { appConfig } from "./appConfig";
import { createLogger } from "./loggers";
dotenv.config();

const logger = createLogger('Redis');

const {
    host = process.env.REDIS_HOST,
    port = 6379,
    retry,
    interval,
} = appConfig.redis;

const redisConfig: RedisOptions = {
    host,
    port,
    password: process.env.REDIS_PASSWORD || undefined
}

let redisClient: RedisClient | null = null;
console.log(redisConfig);
const createRedisClient = (): RedisClient => {
    const client = new Redis(redisConfig);

    client.on('connect', async () => {
        logger.info("Redis Connection established");
    });

    client.on('error', (err: Error) => {
        logger.error('Error occured while connecting redis', err.message);
    })

    client.on('close', () => {
        logger.info('Redis connection closed');
    })
    return client;
}

const max_retries: number = Number(retry);
const retry_interval: number = Number(interval);

export const initializeRedis = async (): Promise<RedisClient> => {
    let retries = 0;
    while (retries < max_retries) {
        try {
            redisClient = createRedisClient();
            await redisClient.set('test', 'test1');
            await redisClient.del('test');
            logger.info('Redis Connected Successfully');
            return redisClient;
        } catch (err: any) {
            retries += 1;
            logger.error(`Redis Connection Error. Retries left ${retries}/${max_retries}`, `Error :${err.message}`);
            if (retries >= max_retries) {
                logger.error('Maximun retries reached. Could not connect to redis');
                process.exit(1);
            }
        }
        await new Promise(res => setTimeout(res, retry_interval));
    }

    throw new Error('Unable to initialize the redis');

}

export const setCache = async (key: string, value: string, expiration: number = 3600 * 16): Promise<void> => {
    if (!redisClient) redisClient = await initializeRedis();
    try {
        await redisClient.set(key, value, 'EX', expiration);
    } catch (err: any) {
        logger.error("Failed setting cache", err.message);
    }
}

export const getCache = async (key: string): Promise<string | null> => {
    if (!redisClient) redisClient = await initializeRedis();
    try {
        const value = await redisClient.get(key);
        if (!value) {
            logger.info(`Cache not found: ${key}`);
            return null
        }
        return value;
    } catch (err: any) {
        logger.error(`Failed getting cache1 for ${key}`);
        return null
    }
}


export const deleteCache = async (key: string) => {
    if (!redisClient) redisClient = await initializeRedis();
    try {
        await redisClient.del(key);
    } catch (err: any) {
        logger.error("Failed to delete the cache", err.message);
    }
}