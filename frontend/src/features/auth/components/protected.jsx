import {useAuth} from "../hooks/useAuth";
import {Navigate} from "react-router-dom";

export const Protected = ({children}) => {
    const {loading,user} = useAuth()
    if(loading){
        return <h1>Loading...</h1>
    }
    if(!user){
        
        <Navigate to="/login"/>
        return null

    }

    return children
  
}
