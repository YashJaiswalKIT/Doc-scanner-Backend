import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// ✅ Configure CORS with proper https:// in all domains
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
    // methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

const PORT = process.env.PORT || 8000;
const GMAIL_APP = process.env.GMAIL_APP; // your gmail
const GMAIL_PASS = process.env.GMAIL_PASS; // your gmail app password

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

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Save OTP with 5-min expiry
  otpStore.set(email, { email,otp});

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_APP,
        pass: GMAIL_PASS,
      },
    });

    // Verify connection
    // await transporter.verify();

    // Send email
    await transporter.sendMail({
      from: `"SecureDocs Verification" <${GMAIL_APP}>`,
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP code is: <b>${otp}</b>. It is valid for <b>5 minutes</b>.</p>`,
    });

    console.log(`✅ OTP sent to ${email}: ${otp}`);
    res.status(200).json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error("❌ Failed to send OTP:", error.message);
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

  // Check expiry
  if (Date.now() > expiresAt) {
    otpStore.delete(email);
    return res
      .status(401)
      .json({ success: false, message: "OTP expired, request a new one" });
  }

  // Check match
  if (storedOtp === otp) {
    otpStore.delete(email);
    return res.status(200).json({ success: true, message: "OTP verified" });
  }

  return res.status(401).json({ success: false, message: "Invalid OTP" });
});

// ✅ Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});

