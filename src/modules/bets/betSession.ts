
import { reqData, Settlement } from "../../interface/interface";
import { getCache, setCache } from "../../utils/redisConnection";
import { Socket } from "socket.io";
import { generateUUIDv7, updateBalanceFromAccount } from "../../utils/commonFunctions";
import { calculateWinnings, getUserIP } from "../../utils/helperFunctions";
import { appConfig } from "../../utils/appConfig";
import { insertData } from "./betDb";
import { createLogger } from "../../utils/loggers";

const logger = createLogger('Bets', 'jsonl');

const validateBet = (btAmt: number, choice: number, balance: number, socket: Socket): boolean => {
    if (isNaN(btAmt)) {
        socket.emit("bet_error", "message : Invalid Bet amount type");
        return false;
    }
    if (btAmt > balance) {
        socket.emit("bet_error", "message : Insufficient Balance");
        return false;
    }
    if (btAmt < appConfig.minBetAmount || btAmt > appConfig.maxBetAmount) {
        socket.emit("bet_error", "message : Invalid bet amount.");
        return false;
    }
    if (![0, 1].includes(choice)) {
        socket.emit("bet_error", "message : Invalid choice. Must be 0 (tails) or 1 (heads).");
        return false;
    }
    return true;
};

export const placeBet = async (socket: Socket, data: reqData) => {
    try {
        const cacheKey = `PL:${socket.id}`;
        const playerCache = await getCache(cacheKey);
        if (!playerCache) return socket.emit('bet_error', 'Invalid User');

        const player = JSON.parse(playerCache);
        const { user_id, operatorId, token, game_id, balance } = player;
        const { btAmt, choice } = data;

        if (!validateBet(btAmt, choice, balance, socket)) return;

        const roundId = generateUUIDv7();
        const userIP = getUserIP(socket);

        const debitRes = await updateBalanceFromAccount({
            id: roundId,
            bet_amount: btAmt,
            game_id,
            ip: userIP,
            user_id
        }, "DEBIT", { game_id, operatorId, token });

        if (!debitRes.status) {
            return socket.emit("bet_error", "message : Bet Cancelled by Upstream while debiting from balance ");
        }

        player.balance -= btAmt;
        await setCache(cacheKey, JSON.stringify(player));

        socket.emit('info', {
            user_id,
            operator_id: operatorId,
            balance: player.balance
        });

        logger.info(`Bet Placed | User: ${user_id} | Amount: ${btAmt} | Choice: ${choice}`);

        const { betAmt, winAmt, mult, status, result } = await calculateWinnings(data);

        logger.info(`Winnings | User: ${user_id} | Status: ${status} | Win: ${winAmt} | Mult: ${mult} | Result: ${result}`);

        if (status === "win") {
            await updateBalanceFromAccount({
                id: roundId,
                txn_id: debitRes.txn_id,
                bet_amount: betAmt,
                winning_amount: winAmt,
                game_id,
                user_id
            }, "CREDIT", { game_id, operatorId, token });

            logger.info(`Winning Credited | User: ${user_id} | Amount: ${winAmt}`);

            player.balance += winAmt;
            await setCache(cacheKey, JSON.stringify(player));

            setTimeout(() => {
                socket.emit('info', {
                    user_id,
                    operator_id: operatorId,
                    balance: player.balance
                });
            }, 2000);
        } else {
            logger.info(`Bet Lost | User: ${user_id} | Amount: ${betAmt}`);
        }

        socket.emit("result", {
            status,
            winAmt: winAmt || 0.00,
            mult: mult || 0.00,
            coinResult: result
        });

        const dbObj: Settlement = {
            user_id,
            round_id: roundId,
            operator_id: operatorId,
            bet_on: choice,
            bet_amount: btAmt,
            winning_amount: winAmt,
            multiplier: mult,
            status,
            result
        };
        await insertData(dbObj);

    } catch (err: any) {
        logger.error(`placeBet Error: ${err.message}`);
    }
};
