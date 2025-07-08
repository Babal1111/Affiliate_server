

const CREDIT_PACK = {
    10:10,
    20:20,
    50:50,
    100:100  //100 creidit 100rupye we can also define 100 credit, 1000rs
};

const PLAN_IDS = {
    UNLIMITED_YEARLY :{
        id: process.env.UNLIMITED_YEARLY,
        name: "Unlimited yearly",
        toralBillingCycleCount : 5 // we will charge user for 5 years until he cancels it explicilty
    },
     UNLIMITED_MONTHLY:{
        id: process.env.UNLIMITED_MONTHLY,
        name: "Unlimited Monthly",
        toralBillingCycleCount : 12 
    }
}
module.exports = {CREDIT_PACK,PLAN_IDS};