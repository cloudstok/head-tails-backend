import { settlement } from "../db/tables";
import { appConfig } from "./appConfig";
import { createPool, Pool, PoolConnection, RowDataPacket, FieldPacket, ResultSetHeader } from "mysql2/promise";
import { createLogger } from "./loggers";

const logger = createLogger('Database');

const { host, port, database, password, user, retries, interval } = appConfig.dbConfig

const dbConfig = {
    host,
    user,
    password,
    database,
    port: Number(port)
}

const maxRetries: number = Number(retries);
const retryInterval: number = Number(interval);

let pool: Pool | undefined;

const createDatabasePool = async (config: typeof dbConfig): Promise<void> => {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            pool = createPool(config);
            logger.info('Database pools created and exported');
            return;
        } catch (err: any) {
            attempts += 1;
            logger.error(`Database Connection failed. Retry ${attempts}/${maxRetries}. Error: ${err.message}`);
            if (attempts >= maxRetries) {
                logger.error('Maximum retries reached. Could not connect to database');
                process.exit(1);
            }
            await new Promise((res) => setTimeout(res, retryInterval));
        }
    }
};

export const read = async <T extends RowDataPacket[] = RowDataPacket[]>(
    query: string,
    params: any[] = []
): Promise<T> => {
    if (!pool) throw new Error('Database pool is not initialized');
    const connection: PoolConnection = await pool.getConnection();
    try {
        const [results]: [T, FieldPacket[]] = await connection.execute(query, params);
        return results;
    } finally {
        connection.release();
    }
};

export const write = async (
    query: string,
    params: any[] = []
): Promise<ResultSetHeader> => {
    if (!pool) throw new Error('Database pool is not initialized');
    const connection: PoolConnection = await pool.getConnection();
    try {
        const [results]: [ResultSetHeader, FieldPacket[]] = await connection.execute(query, params);
        return results;
    } finally {
        connection.release();
    }
};

export const createTable = async () => {
    try {
        if (!pool) throw new Error('Databasepool is not initialized');
        const connection: PoolConnection = await pool.getConnection();
        await connection.execute(settlement);
        logger.info('Tables creation query executed');
    } catch (err: any) {
        logger.error('Error creating tables : ', err.message);
    }
}

export const checkDatabaseConnection = async (): Promise<void> => {
    if (!pool) {
        await createDatabasePool(dbConfig);
    }
    logger.info('Database Connection check passed')
};