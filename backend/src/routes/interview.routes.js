const express = require("express");

const authmiddleware = require("../middlewares/auth.middleware");
const interviewcontroller = require("../controllers/interview.controller");
const upload = require("../middlewares/file.middleware");

const interviewrouter = express.Router();

interviewrouter.post(
    "/",
    authmiddleware.authUser,
    upload.single("resume"),
    interviewcontroller.generateInterviewReportcontroller
);

interviewrouter.get(
    "/report/:interviewId",
    authmiddleware.authUser,
    interviewcontroller.getReportByIdcontroller
);

interviewrouter.get(
    "/reports",
    authmiddleware.authUser,
    interviewcontroller.getallinterviewreportscontroller
);

interviewrouter.post("/resume/pdf/:interviewId", authmiddleware.authUser, interviewcontroller.generateResumePDFcontroller);

module.exports = interviewrouter;