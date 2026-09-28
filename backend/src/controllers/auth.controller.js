const usermodel = require('../model/user.model');
const blacklistmodel = require('../model/blacklist.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Redis  = require('ioredis')
dotenv.config();
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT
})
async function registerUser(req, res) { 
    const { name, email, password } = req.body;
    if(!name || !email || !password){
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    try {
        const existingUser = await usermodel.User.findOne({ $or: [{ email }, { name }]});
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await redis.del('allusers');
        await redis.del(`user:${existingUser?._id}`);
        const user = await usermodel.User.create({ name, email, password: hashedPassword });
        
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not here');
            return res.status(500).json({ message: 'Internal server error by jwt secret' });
        }

        const token = jwt.sign(
            { userId: user._id,
            username: user.name
         }, jwtSecret, 
         { expiresIn: '1d' });

        res.cookie("token",token)
        res.status(201).json({ message: 'User registered successfully',
             user:{
            id: user._id,
            name: user.name,
            email: user.email
        },
         });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
async function loginUser(req, res) {
    const { emailOrName, password } = req.body;
    
    try {
        const user = await usermodel.User.findOne({ $or: [{ email:emailOrName }, { name:emailOrName }] });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials 1' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined');
            return res.status(500).json({ message: 'Internal server error' });
        }
        const token = jwt.sign(
            { userId: user._id,
              username: user.name
            },
            jwtSecret,
            { expiresIn: '1d' }
        );
        res.cookie("token",token)
        res.status(200).json({ message: 'Login successful', user:{
            id: user._id,
            name: user.name,
            email: user.email
        }, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


async function logoutUser(req, res) {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(400).json({
                message: "No token found"
            });
        }

        await blacklistmodel.create({
            token: token
        });

        res.clearCookie("token");

        return res.status(200).json({
            message: "Logout successful"
        });

    } catch (error) {
        console.error("LOGOUT ERROR:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

//implemeted without redis
async function getMe(req, res) {
    try{
        const user = await usermodel.User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: "User fetched successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    }catch(error){
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


async function getMeredis(req, res) {
    try {
        const cacheKey = `user:${req.user.userId}`;

        const start = Date.now();

        // 1. Check Redis
        const cached = await redis.get(cacheKey);

        console.log("Redis GET time:", Date.now() - start, "ms");
        console.log("Cache:", cached ? "HIT" : "MISS");

        if (cached) {
            console.log("Returning from REDIS");

            return res.status(200).json({
                message: "User fetched successfully from Redis",
                user: JSON.parse(cached)
            });
        }

        // 2. MongoDB
        const mongoStart = Date.now();

        const user = await usermodel.User.findById(req.user.userId);

        console.log("MongoDB GET time:", Date.now() - mongoStart, "ms");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const userData = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        // 3. Save to Redis
        await redis.set(
            cacheKey,
            JSON.stringify(userData),
            "EX",
            60 * 60 * 24
        );

        console.log("Saved to Redis:", cacheKey);

        return res.status(200).json({
            message: "User fetched successfully from MongoDB",
            user: userData
        });

    } catch (error) {
        console.error("getMeredis ERROR:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

async function getallusers(req, res) {
    try {
        const users = await usermodel.User.find();
        res.status(200).json({
            message: "Users fetched successfully",
            users: users.map(user => ({
                id: user._id,
                name: user.name,
                email: user.email
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getallusersbyredis(req, res) {
    try {
        const cacheKey = `allusers`;

        const start = Date.now();

        // 1. Check Redis
        const cached = await redis.get(cacheKey);

        console.log("Redis GET time:", Date.now() - start, "ms");
        console.log("Cache:", cached ? "HIT" : "MISS");

        if (cached) {
            console.log("Returning from REDIS");

            return res.status(200).json({
                message: "Users fetched successfully from Redis",
                users: JSON.parse(cached)
            });
        }

        // 2. MongoDB
        const mongoStart = Date.now();
        
        const users = await usermodel.User.find();

        console.log("MongoDB GET time:", Date.now() - mongoStart, "ms");

        if (!users) {
            return res.status(404).json({
                message: "Users not found"
            });
        }

        const userData = users.map(user => ({
            id: user._id,
            name: user.name,
            email: user.email
        }));

        // 3. Save to Redis
        await redis.set(
            cacheKey,
            JSON.stringify(userData),
            "EX",
            60 * 60 * 24
        );

        console.log("Saved to Redis:", cacheKey);

        return res.status(200).json({
            message: "Users fetched successfully from MongoDB",
            users: userData
        });

    } catch (error) {
        console.error("getallusersbyredis ERROR:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

module.exports = { registerUser, loginUser, logoutUser,getMe,getMeredis,getallusers,getallusersbyredis };