
const Redis = require('ioredis');
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
});
const ratelimitter=async (req, res, next) => {
    try {
        const ip = req.ip;
        const maxRequests = 4;
        const timeWindow = 60; // 1 minute
        const key = `ratelimit:${ip}`;

        const currentRequests = await redis.incr(key);
        if (currentRequests > maxRequests) {
            return res.status(429).json({ message: 'Too many requests' });
        }
        if(currentRequests === 1){
            await redis.expire(key, timeWindow);
        }
        next();
    } catch (error) {
        console.error('Error in rate limit middleware:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { ratelimitter };