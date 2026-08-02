// googleAuthController.js
//
// Add this alongside your existing auth controller. It handles the
// "Sign in with Google" flow:
//
//   1. Frontend sends us the access_token Google gave it after the user
//      picked an account.
//   2. We ask Google directly whether that token is real, and which
//      email it belongs to. This can't be faked by the client.
//   3. We look that email up in our own User collection.
//        - found     -> issue our normal JWT, same as password login
//        - not found -> 404, "email not linked to any account"
//
// No verification email is sent — Google already proved the user owns
// the email when they completed the Google sign-in popup.

const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const googleLogin = async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ success: false, message: "Missing Google access token" });
    }

    // Ask Google to confirm this token is genuine and get the account info.
    let googleUser;
    try {
      const googleRes = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      googleUser = googleRes.data;
    } catch (googleErr) {
      // Token was invalid, expired, or forged
      return res.status(401).json({ success: false, message: "Invalid Google token" });
    }

    if (!googleUser?.email || !googleUser.email_verified) {
      return res.status(401).json({ success: false, message: "Google account email not verified" });
    }

    // Look the email up in our own database — this is the "must already exist" rule.
    const user = await User.findOne({ email: googleUser.email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "This email is not linked to any account",
      });
    }

    // Same token shape/expiry your normal /api/auth/login uses.
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // <-- match whatever your existing login uses
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    return res.status(500).json({ success: false, message: "Server error during Google login" });
  }
};

module.exports = { googleLogin };


// --- In your authRoutes.js, add: ---
//
// const { googleLogin } = require("../controllers/googleAuthController");
// router.post("/google-login", googleLogin);