// utils/sendEmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4, // ← forces IPv4, avoids Render's IPv6 ENETUNREACH issue
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