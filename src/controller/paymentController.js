const RazorPay = require('razorpay');
const { CREDIT_PACK, PLAN_IDS } = require('../constants/payments');
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

        if(razorpay_signature !== expectedSignature){  // ? reverifying 
        return response.status(400).json({
            message: "payment verification failed"
        })
        }

        const user = await Users.findById({_id: request.user.id});
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
    },

    //3 methods for subscription add, del, and webhook
    createSubscription :async (request,response) =>{
        try{
            const {plan_name} = request.body;
            if(!PLAN_IDS[plan_name]){ // we check if the plan ids are one of the 2 we defined in constants
                return response.status(400).json({
                    message: "invalid plan"
                });
            }

            const plan = PLAN_IDS[plan_name];
            const subscription = await razorpay.subscription.create({
                plan_id:plan.id,
                customer_notify:1,
                total_count:plan.totalBillingCycleCount,
                // Cstmr notes field, razorpay sends it as is in the events
                //wecan use this feild to set user id so that we know the event
                //belongs to which user in our 
                notes:{
                    email: request.user.username,
                    userId: request.user.id
                }
            });
        }
        catch(error){
            console.log(error);
            response.status(500).json({
                message:"internal server error"
            });
        }
    },

    verifySubscription: async (request,response)=>{
        //isme ham verify nhi kr re, just checking ki user dubarase subscription na le le
        try{
            const {subscription_id} = request.body;
            const subscription = await razorpay.subscription.fetch(subscription_id);

            const user = await Users.findById({_id:request.user.id});
            user.subscription = {
                id : subscription_id,
                planId: subscription.plan.id,
                status: subscription.status,
                start: subscription.current_start?
                new Date(subscription.current_start *1000) :null,
                end: subscription.current_end?
                new Date(subscription.current_end*1000):null,
                

            };

            await user.save();
            response.json({user:user});

        }
        catch(error){
            console.log(error);
            response.status(500).json({
                message:"internal server error"
                });
        }
    },
    handleWebhookEvent: async(request, response) =>{
        try{
            console.log("recieved event....");
            const signature = request.headers['x-razorpay-signature'];
            const body = request.body;

            const expectedSignature = crypto
            .createHmac('sha256',process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(body)
            .digest('hex');

            // isme hame body ko string nhi krna raw hu passkrna, 
            // ham manualy sabh ko parse krenge
            // aa.use(json) sirf cookies,query,params etc ko hi parse kr pata ? 
            if (signature !== expectedSignature) {
                console.log('Invalid signature');
                return response.status(400).json({ message: 'Invalid signature' });
            }

            const payload = JSON.parse(body);
            // directly bhi body ko print krwa skte but will not be pritty format
            console.log(JSON.stringify(payload,0,2)); // 0 matlab ham kuch br=e replace nhi krwana chata, 2 matlab 2 tab spaces

            const event = payload.event;
            const subscriptionData = payload.payload.subscription.entity;
            const razorpaySubscriptionId = subscriptionData.id;

            let userId = subscriptionData.notes?.userId;
            if(!userId){
                console.log("userid not found via notes");
                return response.status(400).send('userid not found via notes');
            }

            let newStatus = "";

            switch(event){
                case 'subscription.activated':
                    newStatus = 'active';
                    break;
                case 'subscription.pending':
                    newStatus = 'pending';
                    break;
                case 'subscription.cancelled':
                    newStatus = 'cancelled';
                    break;
                case 'subscription.completed':
                    newStatus = 'completed';
                    break;
                default:
                console.log('unhandled event :',event);
                return response.status(200).send('unhandeled event');
            }

            const user = await Users.findOneAndUpdate({_id: userId},{
                $set:{
                    'subscription.id':razorpaySubscriptionId,
                    'subscription.status':newStatus,
                    'subscription.start': subscriptionData.start_at?
                    new Date(subscriptionData.start_at*1000):null,
                    'subscription.end': subscriptionData.end_at?
                    new Date(subscriptionData.end_at*1000):null,
                    'subscription.lastBillDate': subscriptionData.current_start?
                    new Date(subscriptionData.current_start*1000):null,
                    'subscription.nextBillDate': subscriptionData.current_end?
                    new Date(subscriptionData.current_end*1000):null,
                    'subscription.paymentsMade': subscriptionData.paid_count,
                    'subscription.paymentsRemaining': subscriptionData.remaining_count,
                }
            },{
                new: true  //??
            });
                if(!user){
            console.log('user not found');
            return response.status(400).send('user not found');

        }
        console.log(`updated subscription for user${user.username} to ${newStatus}`);
        }        
        catch(error){
            console.log(error);
            response.status(500).json({
                message:"internal server error"
                });
        }
    },
    cancelSubscription: async(request, response) =>{
        try{
            const {subscription_id} = request.body;

            if(!subscription_id){
                console.log('subscription id is required');
                // diff bw send and json
                return response.status(400).json({
                    message:'Subscriptionid is req'
                });
                
            }
            const data = await razorpay.subscriptions.cancel(subscription_id);
            //will immediately cancel the subsId

            response.send(data);
        }
        catch(error){
            console.log(error);
            response.status(500).json({
                message:"internal server error"
                });
        }
    }

}
module.exports = paymentController;