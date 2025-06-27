export interface UserData {
    user_id: string,
    operatorId: string,
    balance: string
}

export interface FinalUserData extends UserData {
    userId: string,
    game_id: string,
    token: string
}

export interface reqData {
    choice: 0 | 1,
    btAmt: number
}

export type WebhookKey = 'CREDIT' | 'DEBIT';

export interface BetData {
    id: string,
    bet_amount?: number,
    winning_amount?: number,
    game_id?: string,
    ip?: string,
    user_id?: string,
    txn_id?: string,
    bet_id?: string
}

export interface BetResult {
    status: "win" | "loss";
    betAmt: number;
    winAmt: number;
    mult: number
    error?: string
}

export interface WebhookData {
    txn_id: string;
    txn_ref_id?: string;
    ip?: string;
    game_id: string | undefined;
    user_id: string;
    amount?: string | number;
    description?: string;
    bet_id?: string;
    txn_type?: number;

};

export interface PlayerDetails {
    game_id: string;
    operatorId: string;
    token: string
};

export interface AccountResult {
    status: boolean,
    type: string,
    txn_id?: string
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
    time: number;
    level: LogLevel;
    name: string;
    msg: string;
};

interface DBConfig {
    host: string;
    user: string;
    password: string;
    database: string;
    port: string;
    retries: string;
    interval: string;
};

interface RedisConfig {
    host: string;
    port: number;
    retry: number;
    interval: number;
};

export interface AppConfig {
    minBetAmount: number;
    maxBetAmount: number;
    maxCashoutAmount?: number;
    dbConfig: DBConfig;
    redis: RedisConfig;
};

export interface Settlement {
    round_id: string;
    user_id: string;
    operator_id: string;
    bet_on: 0 | 1;
    bet_amount: number;
    winning_amount?: number;
    multiplier: number;
    status: "win" | "loss"
    result?: number
}
