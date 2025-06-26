import crypto from "crypto";
import { BetData, WebhookKey, WebhookData, PlayerDetails, AccountResult } from "../interface/interface";
import axios, { AxiosRequestConfig } from "axios";
import { sendToQueue } from "./amqp";

export const generateUUIDv7 = () => {
    const timeStamp = Date.now();
    const timeHex = timeStamp.toString(16).padStart(12, '0');
    const randomBits = crypto.randomBytes(8).toString('hex').slice(2);
    const uuid = [
        timeHex.slice(0, 8),
        timeHex.slice(8) + randomBits.slice(0, 4),
        '7' + randomBits.slice(4, 7),
        (parseInt(randomBits.slice(7, 8), 16) & 0x3f | 0x80).toString(16) + randomBits.slice(8, 12),
        randomBits.slice(12)
    ]
    return uuid.join('-');
}

export const prepareDataForWebhook = async (data: BetData, key: WebhookKey): Promise<WebhookData | false> => {
    try {
        const { id, bet_amount, winning_amount, game_id, user_id, txn_id } = data;

        if (!user_id) {
            throw new Error('Error from prepare data for webhook : User is  required')
        }
        const amountFormatted = Number(bet_amount).toFixed(2);
        let baseData: WebhookData = {
            txn_id: generateUUIDv7(),
            game_id,
            user_id: decodeURIComponent(user_id)
        }

        switch (key) {
            case "DEBIT":
                baseData.amount = amountFormatted;
                baseData.description = `${amountFormatted} has been debited for Heads and Tails game for round_id ${id}`;
                baseData.game_id = game_id;
                baseData.user_id = user_id;
                baseData.txn_type = 0;
                break;
            case "CREDIT":
                baseData.amount = winning_amount;
                baseData.description = `${winning_amount} has been credited for Heads and Tails game for round_id ${id}`;
                baseData.txn_ref_id = txn_id
                baseData.game_id = game_id;
                baseData.user_id = user_id;
                baseData.txn_type = 1;
                break;
        }
        return baseData;

    } catch (err) {
        console.error(`Error while preparing for webhook data:`, err);
        return false;
    }

}

export const updateBalanceFromAccount = async (data: BetData, key: WebhookKey, playerDetails: PlayerDetails): Promise<AccountResult> => {
    try {
        const webhookData = await prepareDataForWebhook({ ...data, game_id: playerDetails.game_id }, key);
        console.log('Webhook data', webhookData)
        if (!webhookData)
            return { status: false, type: key }

        if (key === 'CREDIT') {
            await sendToQueue('', 'games_cashout', JSON.stringify({ ...webhookData, operatorId: playerDetails.operatorId, token: playerDetails.token }));
            return { status: true, type: key };
        };

        data.txn_id = webhookData.txn_id;
        const sendRequest = await sendRequestToAccount(webhookData, playerDetails.token);
        console.log('called request')
        if (!sendRequest) return { status: false, type: key };

        return { status: true, type: key, txn_id: data.txn_id }
    } catch (err: any) {
        console.log('Error while updating balance from account :', err.message)
        return { status: false, type: key };
    }
}

export const sendRequestToAccount = async (webhookData: WebhookData, token: string): Promise<Boolean> => {
    try {
        console.log('came to send request')
        let clientServerOption: AxiosRequestConfig = {
            method: 'POST',
            url: `${process.env.BASE_URL}/service/operator/user/balance/v2`,
            headers: {
                token
            },
            data: webhookData,
            timeout: 5000
        }
        const data = (await axios(clientServerOption)).data;
        console.log('leaving send request:  ', data)
        if (!data.status) return false
        return true;
    } catch (err: any) {
        console.error(`Err while sending request to accounts is:::`, err.message);
        return false;
    }
}
