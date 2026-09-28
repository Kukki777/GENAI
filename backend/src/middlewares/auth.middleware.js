const jwt = require("jsonwebtoken");
const tokenblacklist = require("../model/blacklist.model");
async function authUser(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized - token missing"
        });
    }
    const istokenblacklisted = await tokenblacklist.findOne({ token: token });
    if (istokenblacklisted) {
        return res.status(401).json({
            message: "Unauthorized - token blacklisted"
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );


        req.user = decoded;
        next();

    } catch (error) {
        console.error("JWT ERROR:", error.message);
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

module.exports = { authUser };