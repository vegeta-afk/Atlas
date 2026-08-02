// utils/sendEmail.js
//
// Simple nodemailer wrapper. Works with Gmail using an "App Password"
// (not your normal Gmail password — generate one at
// https://myaccount.google.com/apppasswords, requires 2FA enabled on
// that Google account).
//
// Add to your server .env:
//   EMAIL_USER=youraddress@gmail.com
//   EMAIL_PASS=your16charapppassword
//   CLIENT_URL=https://atlas-green-two.vercel.app   (no trailing slash)

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"IIT Computer Institute" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;