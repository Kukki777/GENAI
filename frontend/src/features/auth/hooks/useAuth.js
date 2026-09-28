import { useContext } from "react";
import { AuthContext } from "../auth.context";

import {
  loginUser,
  registerUser,
  logoutUser,
} from "../services/auth.api";

export const useAuth = () => {
  const context = useContext(AuthContext);

  const {
    user,
    setUser,
    loading,
    setLoading,
  } = context;

  const handleLogin = async ({ emailOrName, password }) => {
    setLoading(true);

    try {
      const res = await loginUser({
        emailOrName,
        password,
      });

      setUser(res.user);

      return res;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async ({ name, email, password }) => {
    setLoading(true);

    try {
      const res = await registerUser({
        name,
        email,
        password,
      });

      setUser(res.user);

      return res;
    } catch (error) {
      console.error("Register failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);

    try {
      const res = await logoutUser();

      setUser(null);

      return res;
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    setUser,
    loading,
    setLoading,
    handleLogin,
    handleRegister,
    handleLogout,
  };
};