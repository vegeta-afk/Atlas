// utils/sendEmail.js
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  const { error } = await resend.emails.send({
    from: "IIT Computer Institute <onboarding@resend.dev>", // swap once you verify your own domain
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email");
  }
};

module.exports = sendEmail;