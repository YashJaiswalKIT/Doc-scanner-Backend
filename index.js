import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Resend } from "resend";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://doc-scanner.vercel.app",
      "https://doc-scanner-hxn2r2wxq-yashjaiswalkits-projects.vercel.app",
      "https://doc-scanner-9shgs0vnr-yashjaiswalkits-projects.vercel.app",
      "https://doc-scanner-git-main-yashjaiswalkits-projects.vercel.app",
      "https://doc-scanner-ten.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

const PORT = process.env.PORT || 8000;
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ In-memory OTP storage with expiry
const otpStore = new Map();

/**
 * Send OTP Route
 */
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Save OTP with 5 min expiry
  otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

  try {
    await resend.emails.send({
      from: "SecureDocs <onboarding@resend.dev>", // default from Resend
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP is: <b>${otp}</b>. It is valid for 5 minutes.</p>`,
    });

    console.log(`OTP sent to ${email}: ${otp}`);
    res.status(200).json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error(" Failed to send OTP:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
});

/**
 * Verify OTP Route
 */
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res
      .status(400)
      .json({ success: false, message: "Email and OTP are required" });
  }

  const storedData = otpStore.get(email);

  if (!storedData) {
    return res
      .status(401)
      .json({ success: false, message: "OTP not found or expired" });
  }

  const { otp: storedOtp, expiresAt } = storedData;

  if (Date.now() > expiresAt) {
    otpStore.delete(email);
    return res
      .status(401)
      .json({ success: false, message: "OTP expired, request a new one" });
  }

  if (storedOtp === otp) {
    otpStore.delete(email);
    return res.status(200).json({ success: true, message: "OTP verified" });
  }

  return res.status(401).json({ success: false, message: "Invalid OTP" });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(` Server running at http://0.0.0.0:${PORT}`);
});
