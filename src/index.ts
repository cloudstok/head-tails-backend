import express from "express";
import cors from "cors"
import http from "http";
import { Server } from "socket.io";
import { socket } from "./socket"
import { initializeRedis } from "./utils/redisConnection";
import { connect } from "./utils/amqp";
import { checkDatabaseConnection, createTable } from "./utils/dbConnection";
import { routes } from "./routes/routes";


const port = process.env.PORT
const initServer = async () => {

    await Promise.all([checkDatabaseConnection(), initializeRedis(), connect(), createTable()])

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);
    app.use(cors());
    app.use(express.json());
    socket(io);
    app.use(routes);

    server.listen(port, () => {
        console.log(`Server is running on port: ${port}`);
    })

}

initServer()





