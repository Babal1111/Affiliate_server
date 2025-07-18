const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.ADMIN_EMAIL_password
    }
});

const send = async (to, subject, body) => {
    const emailOptions = {
        to: to,
        subject: subject,
        text: body,
        from: process.env.ADMIN_EMAIL
    };

    try {
        await transporter.sendMail(emailOptions);
    } catch (error) {
        console.log(error);
        throw error;
    }
};

module.exports = { send };