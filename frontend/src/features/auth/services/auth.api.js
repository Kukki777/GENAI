import axios from "axios";
const api=axios.create({
        baseURL: "http://localhost:3003",
        withCredentials: true
})
export const registerUser = async({name, email, password}) => {
    
    try {
        const res = await api.post("/api/auth/register", { name, email, password });
        return res.data;
    }
    catch (error) {
        console.error(error);
    }

};


export const loginUser = async ({ emailOrName, password }) => {
    try {
        const res = await api.post(
            "/api/auth/login",
            {
                emailOrName,
                password
            }
            
        );

        return res.data;

    } catch (error) {
        console.error(error);
        throw error;
    }
};

export async function logoutUser() {
    try {
        const res = await api.get("/api/auth/logout");
        return res.data;
    } catch (error) {
        console.error(error);
    }
}


export async function getUser() {
    try {
        const res = await api.get("/api/auth/userdetails");
        return res.data;
    } catch (error) {
        console.error(error);
    }
}