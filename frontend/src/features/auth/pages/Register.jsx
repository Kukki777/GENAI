import React from 'react'
import { useState } from "react";
import {Link, useNavigate} from "react-router"
import { useAuth } from '../hooks/useAuth';

const Register = () => {
    const navigate = useNavigate();
    const[username,setUsername] = useState("");
    const[email,setEmail] = useState("");
    const[password,setPassword] = useState("");


    const {loading, handleRegister} = useAuth();

    const handleSubmit = async() => {
        e.preventDefault();
        try {
            await handleRegister({
                name:username,
                email,
                password
            });
            navigate("/");
        } catch (error) {
            console.log(error);
        }
    }
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
        <h1>Register</h1>
        <form onSubmit={handleSubmit}>
            <div className="input-group">
            <label htmlFor="Name">Username</label>

            <input
              onChange={(e)=>{setUsername(e.target.value)}}
              type="text"
              name="name"
              id="username"
              placeholder="Enter username"
            />
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>

            <input
              onChange={(e)=>{setEmail(e.target.value)}}
              type="email"
              name="email"
              id="email"
              placeholder="Enter email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>

            <input
              onChange={(e)=>{setPassword(e.target.value)}}
              type="password"
              name="password"
              id="password"
              placeholder="Enter password"
            />
          </div>
          <button className="button primary-button">Register </button>
        </form>
        <p>Already have an account? <Link onClick={() => navigate("/login")}>Login</Link></p>
      </div>
    </main>
  )
}

export default Register
