const Links = require('../model/Links');
const axios = require('axios');



const LinksController=()=>{




    analytics: async(request, response)=>{
        try {
            const {linkId, from, to} = request.query;

            const link = Links.findById(linkId);
            if(!link){
                return response.status(404).json({
                    error:'Link not found'
                });
            }

            //jo user loggedin h kya link usi ki h?

            const userId = request.user.role === 'admin'? request.user.id: request.user.adminId;
            if(link.user.toString()!== userId){
                return response.status(403).json({error: 'Unauthorized access'})
            }
            // as fromDate and toDate are optiona (we set) so we make mongoDb query accordingly
            const query = {
                linkId: linkId
            };
            if(from && to){
                query.clickedAt= {$gte: new Date(from),$lte: new Date(to)};
            }
            const data = await Clicks.find(query).sort({clickedAt: -1});
            response.json(data);
            
        } catch (error) {
            console.log(error);
            response.status(500).json({
                message: 'Internal Server'
            })
            
        }
    }
}