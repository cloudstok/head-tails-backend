import { Socket, Server } from "socket.io";
import { fetchUserDetails } from "./utils/fetchUserDetails";
import { deleteCache, setCache } from "./utils/redisConnection";
import { eventRouter } from "./routes/eventRouter";
import { createLogger } from "./utils/loggers";

const logger  = createLogger('Socket')

export function socket(io: Server) {
    io.on('connection', async (socket: Socket) => {
        const token = socket.handshake.query.token as string;
        const game_id = socket.handshake.query.game_id as string;

        if (!token || !game_id) {
            socket.disconnect(true);
            logger.error("Missing parameters :", { token, game_id });
            return;
        }

        const userData = await fetchUserDetails(token, game_id);
        
        if (!userData) {
            socket.disconnect(true);
            logger.error('Invalid User');
            return;
        }

        socket.emit('info', {
            user_id: userData?.userId,
            operator_id: userData?.operatorId,
            balance: userData?.balance
        });

        await setCache(`PL:${socket.id}`, JSON.stringify(userData), 3600);
        logger.info(`Saved the user details for PL:${socket.id} in Redis`)

        eventRouter(socket);

        socket.on('disconnect', async () => {
            await deleteCache(`PL:${socket.id}`);
            logger.info('Server Disconnected : Deleted the cache of user')
        })

        socket.on('error', (err: Error) => {
            logger.error(`Connection error for socket : ${socket.id}`, err.message);
        })
    });

}
