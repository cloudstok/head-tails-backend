import express from "express";
const routes = express.Router();
import { readData } from "../modules/bets/betDb";

routes.get('/', async (req, res) => {
    res.send({ status: true, msg: 'Heads and Tails game tested successfully' });
});

routes.get('/games-history', async (req, res) => {
    try {
        const { user_id, operator_id, limit } = req.query as {
            user_id: string;
            operator_id: string;
            limit?: string;
        };
        if (!user_id || !operator_id){
            res.status(400).json({status : false, message: 'Required params : user_id and operator_id'});
        };  

        const parsedLimit = limit ? parseInt(limit,10): 10
        const result = await readData(user_id, operator_id,parsedLimit);
        if(!result || result.length === 0) {
             res.status(404).json({status: false, data: result})
        }
         res.status(200).json({ status: true, data: result });
    } catch (err: any) {
         res.status(500).json({ status: false, message: 'Error fetching game history', error: err.message });
    };
});

export { routes };