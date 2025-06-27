import { Socket } from "socket.io"
import { reqData } from "../interface/interface"
import { placeBet } from "../modules/bets/betSession"

export const eventRouter = async (socket: Socket) => {
    socket.on('bt', async (data: reqData) => await placeBet(socket, data));
};