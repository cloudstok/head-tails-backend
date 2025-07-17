import { reqData } from "../interface/interface";

export const getUserIP = (socket: any): string => {
    const forwardedFor = socket.handshake.headers?.['x-forwarded-for'];
    if (forwardedFor) {
        const ip = forwardedFor.split(',')[0].trim();
        if (ip) return ip;
    }
    return socket.handshake.address || '';
};

function getRandomNumber() {
    return Math.floor(Math.random() * 2);
}

export const calculateWinnings = async (data: reqData) => {
    const winningNumber = getRandomNumber();
    let finalObj = {
        betAmt: data.btAmt,
        winAmt: 0,
        mult: 0,
        status: "loss" as "win" | "loss",
        result:winningNumber
    };
    if (winningNumber == data.choice) {
        finalObj.status = "win";
        finalObj.mult = 1.98;
        finalObj.winAmt = finalObj.betAmt * finalObj.mult;
    }
    return finalObj;
}


