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
    //user tables m jo ham employees define krenge,unke parent ki id aise agmin id mai store krenge
    credits:{type: Number, default:0},

    subscription : {type:subscriptionSchema, default:()=>({})},

    resetPasswordOtp :{type:String,required: false},
    resetPasswordExpires : {type:Date,required: false},
});

module.exports = mongoose.models['users'] || mongoose.model('users', UsersSchema);
