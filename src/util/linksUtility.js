// example userAgents
// mozilla /5

const getDeviceInfo = (userAgent)=>{
    const isMobile = /mobile/i.test(userAgent);
    const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|opera|Brave)/i)?.[0] || 'unknown';

    return{
        deviceType: isMobile ? 'Mobile': 'Desktop',
        browser: browser
    }
}

module.exports = {getDeviceInfo};