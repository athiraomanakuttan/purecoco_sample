const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port:process.env.SMTP_PORT,
    secure:false,
    auth: {
        user: process.env.MAIL,
        pass: process.env.PASS
    }
})

function sendOtpMail(email,otp){

    const mailOptions ={
        from:"Pure QoQo",
        to:email,
        subject:"Verifivation code from Pure QoQo",
        text: `Please use the verification code ${otp} to sign in. If you didn't request this, you can ignore this email.`
    }

    transporter.sendMail(mailOptions,(err,info)=>{
        if(err){
            console.log(`Error while sending mail ${err}`)
        }else{
            console.log('Email sent successfully')
        }
    })
}
  module.exports = sendOtpMail;