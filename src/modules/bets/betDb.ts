import { Settlement } from "../../interface/interface"
import { write } from "../../utils/dbConnection";

const SQL_INSERT_QUERY = 'INSERT INTO settlement (user_id, round_id, operator_id, bet_on, bet_amount, winning_amount, multiplier, status, result) VALUES (?,?,?,?,?,?,?,?,?)'
export const insertData = async (data: Settlement) => {
    try {
        const { user_id, round_id, operator_id, bet_on, bet_amount, winning_amount, multiplier, status, result } = data;
        await write(SQL_INSERT_QUERY, [
            decodeURIComponent(user_id),
            round_id,
            operator_id,
            bet_on,
            Number(bet_amount).toFixed(2),
            Number(winning_amount).toFixed(2),
            Number(multiplier).toFixed(2),
            status,
            result
        ]);
        console.log('Inserted settlement values successfully');
    } catch (err: any) {
        console.log('Error inserting the data :', err.message);
    }
};