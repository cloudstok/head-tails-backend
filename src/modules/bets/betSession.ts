import { reqData, Settlement } from "../../interface/interface";
import { getCache, setCache } from "../../utils/redisConnection";
import { Socket } from "socket.io";
import { generateUUIDv7 } from "../../utils/commonFunctions";
import { updateBalanceFromAccount } from "../../utils/commonFunctions";
import { calculateWinnings, getUserIP } from "../../utils/helperFunctions";
import { appConfig } from "../../utils/appConfig";
import { insertData } from "./betDb";
import { createLogger } from "../../utils/loggers";

const logger = createLogger('Bets', 'jsonl');

export const placeBet = async (socket: Socket, data: reqData) => {
    try {
        const playerDetails = await getCache(`PL:${socket.id}`);
        if (!playerDetails) {
            return socket.emit('bet_error', 'Invalid User');
        }
        const parsedPlayerDetails = JSON.parse(playerDetails);
        const { user_id, operatorId, token, game_id, balance } = parsedPlayerDetails;
        const { btAmt, choice } = data;

        if (isNaN(Number(btAmt))) return socket.emit("bet_error", "message : Invalid Bet amount type");
        if (btAmt > Number(balance)) return socket.emit("bet_error", "message : Insufficient Balance");
        if (btAmt < appConfig.minBetAmount || btAmt > appConfig.maxBetAmount) {
            return socket.emit("bet_error", "message : Invalid bet amount.");
        }
        if (![0, 1].includes(choice)) {
            return socket.emit("bet_error", "message : Invalid choice. Must be 0 (tails) or 1 (heads).");
        }

        const roundId = generateUUIDv7();
        const userIP = getUserIP(socket);
        const webhookData = await updateBalanceFromAccount({
            id: roundId,
            bet_amount: btAmt,
            game_id,
            ip: userIP,
            user_id
        }, "DEBIT", { game_id, operatorId, token });

        if (!webhookData.status) return socket.emit("bet_error", "message : Bet Cancelled by Upstream while debiting from balance ");
        parsedPlayerDetails.balance -= btAmt;
        logger.info(`Bet Placed Successfully => player : ${JSON.stringify(parsedPlayerDetails)}, bet_amount : ${btAmt}, choice : ${choice}`);
        await setCache(`PL:${socket.id}`, JSON.stringify(parsedPlayerDetails));

        socket.emit('info', {
            user_id,
            operator_id: operatorId,
            balance: parsedPlayerDetails.balance
        });

        // Bet Result   
        const { betAmt, winAmt, mult, status, result } = await calculateWinnings(data);
        logger.info(`Winnings calculated for PL:${user_id}. Status: ${status}, WinAmt: ${winAmt}, Multiplier: ${mult}, Result: ${result}`);
        const txn_id = webhookData.txn_id;

        if (status == "win") {
            await updateBalanceFromAccount({
                id: roundId,
                txn_id: txn_id,
                bet_amount: betAmt,
                winning_amount: winAmt,
                game_id: game_id,
                user_id
            }, "CREDIT", ({
                game_id: game_id,
                operatorId: operatorId,
                token: token
            }))
            logger.info(`Won the bet : Credited winning_amount ${winAmt} in the balance for PL:${user_id}`)
        } else {
            logger.info(`lost the bet : Debited betting_amount ${betAmt} from the balance for PL:${user_id}`)
        }
        parsedPlayerDetails.balance += winAmt;

        await setCache(`PL: ${socket.id}`, JSON.stringify(parsedPlayerDetails));

        if (status === 'win') {
            setTimeout(() => {
                socket.emit('info', {
                    user_id,
                    operator_id: operatorId,
                    balance: parsedPlayerDetails.balance
                });
            }, 2000);
        }

        socket.emit("result", {
            status: status,
            winAmt: winAmt || 0.00,
            mult: mult || 0.00,
            coinResult: result
        });

        // Insert Data
        const dbObj: Settlement = {
            user_id,
            round_id: roundId,
            operator_id: operatorId,
            bet_on: choice,
            bet_amount: Number(btAmt),
            winning_amount: Number(winAmt),
            multiplier: Number(mult),
            status,
            result
        }

        await insertData(dbObj);

    } catch (err: any) {
        logger.error('Error in placing bets', err.message);
    }
} 