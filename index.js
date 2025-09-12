import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();


app.use(cors({
  origin: ["http://localhost:3000", "http://192.168.36.67:3000","*"] , 
  credentials: true,
}));

app.use(express.json());

const PORT = process.env.PORT || 8000;
const EMAIL_USER = process.env.GMAIL_APP;
const EMAIL_PASS = process.env.GMAIL_PASS;

const otpStore = new Map();


app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, otp); // 🔐 Temporarily store

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"SecureDocs Verification OTP" <${EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP code is: <b>${otp}</b>. It is valid for 5 minutes.</p>`,
    });

    console.log(`OTP sent to ${email}: ${otp}`);
    res.status(200).json({ success: true, message: "OTP sent",otp });
  } catch (error) {
    console.error("Failed to send OTP:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});


app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  const storedOtp = otpStore.get(email);

  if (storedOtp === otp) {
    otpStore.delete(email); 
    return res.status(200).json({ success: true, message: "OTP verified" });
  }

  return res.status(401).json({ success: false, message: "Invalid or expired OTP" });
});


app.listen(PORT,'0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
