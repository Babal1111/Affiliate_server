const mongoose = require('mongoose');
const subscriptionSchema = new mongoose.Schema({
    id: {type:String}, //razpay subscription id
    status: {type:String, default:'pending'}, 
    start:{type:Date},
    end:{type: Date},
    lastBillDate: {type:Date},
    nextBillDate:{type:Date},
    paymentMode: {type:Number},
    paymentsRemaining: {type:Number}
})

const UsersSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    name: { type: String, required: true},
    isGoogleUser: { type: String, required: false },
    googleId: { type: String, required: false},
    role: { type: String, default: 'admin' },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true } , // ?
    credits:{type: Number, default:0},

    subscription : {type:subscriptionSchema, default:()=>({})},
});

module.exports = mongoose.models['users'] || mongoose.model('users', UsersSchema);
