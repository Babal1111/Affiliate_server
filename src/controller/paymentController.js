const RazorPay = require('razorpay');
const { CREDIT_PACK } = require('../constants/payments');
const crypto  = require('crypto');
const Users = require('../model/Users');
const razorpay = new RazorPay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const paymentController = {
    createOrder: async( request, response) =>{
        try{
            const {credits} = request.body;

            if(!CREDIT_PACK[credits]){
                return response.status(400).json({message: 'usupported credit values'});
            }

            const amount = CREDIT_PACK[credits] * 100; // converting to paisa , as razorpay etc dont works on decimals

            const order = await razorpay.orders.create({
                amount: amount, // in paisa
                currency: 'INR',
                receipt:`reciept_${Date.now()}`,
            }
        );
            response.json({
                order: order
            })
        }
        catch(error){
            console.log(error);
            response.status(500).json({
                message:"internal server error"
            });
        }
    },
    verifyOrder : async(request,response) =>{
        try{
            // when this method is working that means user has already madew payment, we are verifying now
            const {
                razorpay_order_id,razorpay_payment_id, razorpay_signature, credits
            } = request.body;

        const body  = razorpay_order_id+"|"+razorpay_payment_id;

        const expectedSignature = crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET) //?
        .update(body.toString()).digest("hex");

        if(razorpay_signature === expectedSignature){  // ? reverifying 
        return response.status(400).json({
            message: "payment verified"
        })
        }

        const user = await Users.findbyId({_id: request.user.id});
        user.credits += Number(credits);
        await user.save();

        response.json({user :user});
            
        }

        catch(error){
                       console.log(error);
            response.status(500).json({
                message:"internal server error"
            });
        }
    }

}