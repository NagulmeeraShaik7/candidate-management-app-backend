import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

class AuthUseCase {
  constructor(authRepo) {
    this.authRepo = authRepo;

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  static rules = {
    name: {
      regex: /^[A-Za-z ]{1,30}$/,
      message: "Name must contain only alphabets and spaces (max 30 characters).",
    },
    email: {
      regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/,
      message: "Invalid email format.",
    },
    password: {
      regex: /^[a-zA-Z0-9]{1,10}$/,
      message: "Password must be alphanumeric and max 10 characters.",
    },
  };

  validate(fields) {
    for (const [key, value] of Object.entries(fields)) {
      const rule = AuthUseCase.rules[key];
      if (!rule?.regex.test(value)) {
        throw new Error(rule?.message || `Invalid ${key}`);
      }
    }
  }

  generateTokens(user) {
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES || "24h" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
    );

    return { accessToken, refreshToken };
  }

  async sendEmail({ to, subject, text }) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async register({ name, email, password }) {
    this.validate({ name, email, password });

    const userExists = await this.authRepo.findByEmail(email);
    if (userExists) throw new Error("Email already in use");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.authRepo.createUser({ name, email, password: hashedPassword });

    const emailToken = jwt.sign({ email }, process.env.JWT_EMAIL_SECRET, { expiresIn: "15m" });

    const verificationLink = `http://localhost:${process.env.PORT}/api/auth/verify-email?token=${emailToken}`;
    await this.sendEmail({
      to: email,
      subject: "Email Verification",
      text: `Please verify your email by clicking the link: ${verificationLink}`,
    });

    return user;
  }

  async login({ email, password }) {
    const user = await this.authRepo.findByEmail(email);
    if (!user || !user.verified) throw new Error("Invalid credentials or email not verified");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    return { ...this.generateTokens(user), userId: user._id };
  }

  async resetPasswordRequest(email) {
    const user = await this.authRepo.findByEmail(email);
    if (!user) return;

    const resetToken = jwt.sign({ email }, process.env.JWT_RESET_SECRET, { expiresIn: "15m" });

    const resetLink = `http://localhost:${process.env.PORT}/api/auth/reset-password?token=${resetToken}`;
    await this.sendEmail({
      to: email,
      subject: "Password Reset Request",
      text: `Click the following link to reset your password: ${resetLink}`,
    });
  }

  async resetPassword(token, newPassword) {
    this.validate({ password: newPassword });

    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return await this.authRepo.updatePassword(decoded.email, hashedPassword);
  }
}

export default AuthUseCase;
