import React, { useState } from "react";
import "../auth.form.scss";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

const Login = () => {
  const { loading, handleLogin } = useAuth();
  const navigate = useNavigate();

  const [emailOrName, setEmailOrName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await handleLogin({
        emailOrName,
        password,
      });
      navigate("/");

    } catch (error) {
  console.log("Status:", error.response?.status);
  console.log("Response data:", error.response?.data);
  console.log(
    "Full error:",
    JSON.stringify(error.response?.data, null, 2)
  );
}
  };
  if (loading) {
    return (
      <main>
        <div className="form-container">
          <h1>Loading...</h1>
        </div>
      </main>
    );
  }
  return (
    <main>
      <div className="form-container">
        <h1>Login</h1>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="emailOrName">
              Email or Username
            </label>

            <input
              type="text"
              name="emailOrName"
              id="emailOrName"
              placeholder="Enter email or username"
              value={emailOrName}
              onChange={(e) => setEmailOrName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>

            <input
              type="password"
              name="password"
              id="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="button primary-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p>
          Don't have an account?{" "}
          <Link to="/register">Register</Link>
        </p>
      </div>
    </main>
  );
};

export default Login;