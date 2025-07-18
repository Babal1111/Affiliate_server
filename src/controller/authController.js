const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Users = require('../model/Users');
const secret = process.env.JWT_SECRET;
const { OAuth2Client } = require('google-auth-library');
const { validationResult } = require('express-validator');
const { subscribe } = require('../routes/authRoutes');
const refreshTokenSecret = process.env.JWT_REFRESH_TOKEN_SECRET;
const nodemailer = require('nodemailer');
const { send } = require("../service/emailService");

const authController = {
    login: async (request, response) => {
        const errors = validationResult(request);
        if (!errors.isEmpty()) {
            return response.status(401).json({ errors: errors.array() });
        }

        try {
            // These values are here because of express.json() middleware.
            const { username, password } = request.body;

            const data = await Users.findOne({ email: username });
            if (!data) {
                return response.status(401).json({ message: 'Invalid Credentials' });
            }

            const isMatch = await bcrypt.compare(password, data.password);
            if (!isMatch) {
                return response.status(401).json({ message: 'Invalid Credentials' });
            }

            const userDetails = {
                id: data._id,
                name: data.name,
                email: data.email,
                // This is the ensure backward compatibility
                role: data.role ? data.role : 'admin',

                adminId: data.adminId,
                credits:data.credits // added thisafter payment integration

            };
            const token = jwt.sign(userDetails, secret, { expiresIn: '1h' });
            const refreshToken =  jwt.sign(userDetails,refreshTokenSecret,{expiresIn:'7d'});

            response.cookie('jwtToken', token, {
                httpOnly: true,
                secure: true,
                domain: 'localhost',
                path: '/'
            });
            response.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                domain: 'localhost',
                path: '/'
            });
            response.json({ message: 'User authenticated', userDetails: userDetails });
        } catch (error) {
            console.log(error);
            response.status(500).json({ error: 'Internal server error ' });
        }
    },

    logout: (request, response) => {
        response.clearCookie('jwtToken');
        response.clearCookie('refreshToken');
        response.json({ message: 'User logged out successfully' });
    },

    isUserLoggedIn: (request, response) => {
        const token = request.cookies.jwtToken;

        if (!token) {
            return response.status(401).json({ message: 'Unauthorized access' });
        }

        jwt.verify(token, secret, (error, userDetails) => {
            if (error) {
                return response.status(401).json({ message: 'Unauthorized access' });
            } else {
                return response.json({ userDetails: userDetails });
            }
        });
    },

    register: async (request, response) => {
        try {
            const { username, password, name } = request.body;

            const data = await Users.findOne({ email: username });
            if (data) {
                return response.status(401)
                    .json({ message: 'User exist with the given email' });
            }

            const encryptedPassword = await bcrypt.hash(password, 10);

            const user = new Users({
                email: username,
                password: encryptedPassword,
                name: name,
                role: 'admin'
            });
            await user.save();
            const userDetails = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: 'admin',
                credits: user.credits
            };
            const token = jwt.sign(userDetails, secret, { expiresIn: '1h' });

            response.cookie('jwtToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV=== 'production',
                domain: 'localhost',
                path: '/',
                sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
            });
            response.json({ message: 'User authenticated', userDetails: userDetails });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ message: 'Internal server error' });
        }
    },

    googleAuth: async (request, response) => {
        const { idToken } = request.body;
        if (!idToken) {
            return response.status(400).json({ message: 'Invalid request' });
        }

        try {
            const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            const googleResponse = await googleClient.verifyIdToken({
                idToken: idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = googleResponse.getPayload();
            const { sub: googleId, email, name } = payload;

            let data = await Users.findOne({ email: email });
            if (!data) {
                data = new Users({
                    email: email,
                    name: name,
                    isGoogleUser: true,
                    googleId: googleId,
                    role: 'admin'
                });

                await data.save();
            }

            const user = {
                id: data._id ? data._id : googleId,
                username: email,
                name: name,
                role: data.role? data.role : 'admin',
                credits: data.credits
            };

            const token = jwt.sign(userDetails, secret, { expiresIn: '1h' });
            const refreshToken =  jwt.sign(userDetails,refreshTokenSecret,{expiresIn:'7d'});

            response.cookie('jwtToken', token, {
                httpOnly: true,
                secure: true,
                domain: 'localhost',
                path: '/'
            });
            response.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                domain: 'localhost',
                path: '/'
            });
            response.json({ message: 'User authenticated', userDetails: user });
        } catch (error) {
            console.log(error);
            return response.status(500).json({ error: 'Internal server error' });
        }
    },

    // new end point for refreshing a token 
    refreshToken: async(request, response)=>{
        try {
            const refreshToken = request.cookies?.refreshToken;
            //  1st step always check wether the thig is avail/setor not if not send response
            if(!refreshToken){
                return response.status(401).json({message:"no refresh token"});
            }
            const decode = jwt.verify(refreshToken, refreshTokenSecret);
            const data = await Users.findById({_id: decode.id});// we are getting new data as through 7 days the data might have become stale/got changed, eg subscription canceled, links etc
            // mongo was not directly sending it in json format so we made it in json format
            const user = {
                id: data._id,
                username: data.email,
                name: data.name,
                role: data.role? data.role: admin,
                credits: data.credits,
                subscription: data.subscription
            };

            const newAccessToken = jwt.sign(user,secret,{expiresIn:'1m'});
            response.cookie('jwtToken',newAccessToken,{
                httpOnly: true,
                secure: true,
                domain:'localhost',
                path:'/'
            });
            console.log("token refreshed")
            return response.json({message:'Token refreshed', userDetails: user});
        } catch (error) {
           console.log(error);
           response.status(500).json({
            message:'Internal server Error'
           });
        }
    },
    sendResetPasswordToken: async(request,response)=>{
        try {
            // const userName = request.body.email; //both are same;
            const {email} = request.body;
            const user = await Users.findOne({email:email});
            if(!user){
                response.status(404).json({message: "user not exists with this username"});
            }

            // do we need to verify JWT?
            const resetPasswordOtp = Math.random().toString(36).substring(2,8).toUpperCase();
            
            user.resetPasswordOtp = resetPasswordOtp;
            user.resetPasswordExpires=  Date.now() + 5*60*1000;
            // we didmt created a new user updated the extis=d one
            await user.save();

            const subject = "OTP to reset password from Affiliate++";
            const text = `Your password reset OTP is: ${resetPasswordOtp}. It expires in 5 minutes.`;

            await send(email, subject, text);
                console.log("OTP sent to user");
                return response.status(200).json({message:"OTP sent to email"});
            
        } catch (error) {
             console.log(error);
           response.status(500).json({
            message:'Internal server Error'
           });
        }
    },
    resetPassword: async(request,response)=>{   
        try {
            const {email,otp,newPassword} = request.body;
            
            const user = await Users.findOne({email});
            if(!user){
                return response.status(404).json({message: "user not exists with this username"});
            }
            if(user.resetPasswordOtp !== otp){
               return response.status(400).json({message: "Invalid OTP"});
            }
            if(user.resetPasswordExpires < Date.now()){
              return response.status(400).json({message:"OTP has expired"});
            }
            const hashedPassword = await bcrypt.hash(newPassword,10);
            user.password = hashedPassword;
            user.resetPasswordOtp = null;
            user.resetPasswordExpires = null;
            await user.save();

            return response.status(200).json({ message: "Password reset successful" });
        } catch (error) {
            console.log(error);
           response.status(500).json({
            message:'Internal server Error'
           });
        }
    }
};

module.exports = authController;