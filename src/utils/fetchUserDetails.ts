import axios from "axios";
import { FinalUserData, UserData } from "../interface/interface";

export const fetchUserDetails = async (token: string, game_id: string): Promise<FinalUserData | undefined> => {
    try {
        const response = await axios.get(`${process.env.BASE_URL}/service/user/detail`, {
            headers: {
                token
            }
        })
        const userDetails: UserData | undefined = response.data.user;

        if (userDetails) {
        
            const finalUserData: FinalUserData | undefined = {
                ...userDetails,
                game_id,
                token
            }
            return finalUserData;
        }


    } catch (err: any) {
        console.log(`Fetch User Details Error : ${err}`);
    }



}