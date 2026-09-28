const express = require('express');

const authcontroller = require('../controllers/auth.controller');
const authmiddleware = require('../middlewares/auth.middleware');
const ratelimitmiddleware = require('../middlewares/ratelimitredis');
const router = express.Router();

router.post('/register', authcontroller.registerUser);
router.post('/login',ratelimitmiddleware.ratelimitter ,authcontroller.loginUser);
router.get('/logout', authcontroller.logoutUser);


//get user details
router.get('/userdetails', authmiddleware.authUser,authcontroller.getMe);

//get user details from redis
router.get('/userdetails/redis', authmiddleware.authUser,authcontroller.getMeredis);


//get all users
router.get('/allusers', authmiddleware.authUser,authcontroller.getallusers);

//get all users from redis
router.get('/allusers/redis', authmiddleware.authUser,authcontroller.getallusersbyredis);


module.exports = router;