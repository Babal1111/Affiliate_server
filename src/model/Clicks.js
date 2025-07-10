const mongoose =require('mongoose');


const clicksSchema = new mongoose.Schema({
    linkId:{type: mongoose.Schema.Types.ObjectId, ref:'Links',reqired: true},

    ip:String, // request oblect, controller se milega  or bhi aise hi h
    city: String, // will come from ip,api
    country: String,
    region: String,
    latitude: Number,
    longitude: Number,
    isp: String,
    refferrer:String,
    userAgent: String,
    deviceType: String,
    browser:String,

    clickedAt:{type: Date, default: Date.now},

})