const cors = require("cors");
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();

app.use(express.json());
app.use(cookieParser());


const authroutes = require("./routes/auth.routes");
const interviewroutes = require("./routes/interview.routes");

app.use("/api/auth", authroutes);
app.use("/api/interview", interviewroutes);

module.exports = app;