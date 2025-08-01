const jwt = require('jsonwebtoken');
const Users = require('../model/Users');

const authMiddleware = {
    protect: async (request, response, next) => {
        try {
            const token = request.cookies?.jwtToken;
            if (!token) {
                return response.status(401)
                    .json({ error: 'Not Authorized'});
            }

            const user = jwt.verify(token, process.env.JWT_SECRET);

            if(user) {
                request.user = await  Users.findById({_id: user.id});

            }
            else{
                return response.status(401).json({message:"invalid token"});  // ? why we added this
            }
            request.user = user;
            next();
        } catch (error) {
            console.log(error);
            return response.status(500)
                .json({ error: 'Internal server error'});
        }
    },
};

module.exports = authMiddleware;