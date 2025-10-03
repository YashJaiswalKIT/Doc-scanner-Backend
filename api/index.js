import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

// OTP store (⚠ stateless in Vercel; use DB for production)
const otpStore = new Map();

app.use(
  cors({
    origin: "*",
    credentials: true
  })
);

app.use(express.json());

// Send OTP route
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP is: <b>${otp}</b>. It is valid for 5 minutes.</p>`
    });

    console.log(`OTP sent to ${email}: ${otp}`);
    return res.status(200).json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error("Failed to send OTP:", error);
    return res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
  }
});

// Verify OTP route
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  const storedData = otpStore.get(email);
  if (!storedData) {
    return res.status(401).json({ success: false, message: "OTP not found or expired" });
  }

  const { otp: storedOtp, expiresAt } = storedData;
  if (Date.now() > expiresAt) {
    otpStore.delete(email);
    return res.status(401).json({ success: false, message: "OTP expired" });
  }

  if (storedOtp === otp) {
    otpStore.delete(email);
    return res.status(200).json({ success: true, message: "OTP verified" });
  }

  return res.status(401).json({ success: false, message: "Invalid OTP" });
});

// Vercel handler export
export default app;
