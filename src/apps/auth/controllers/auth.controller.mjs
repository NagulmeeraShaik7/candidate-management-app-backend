import AuthRepository from "../repositories/auth.repository.mjs";
import AuthUseCase from "../usecases/auth.usecase.mjs";
import jwt from "jsonwebtoken";

const authRepo = new AuthRepository();
const authUseCase = new AuthUseCase(authRepo);

export const registerUser = async (req, res) => {
  try {
    const user = await authUseCase.register(req.body);
    res.status(201).json({ message: "User registered. Please verify email.", userId: user._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const result = await authUseCase.login(req.body);
    res.status(200).json({ message: "Login successful", ...result });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh token missing" });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES || "24h" }
    );

    res.json({ accessToken });
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired refresh token" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: "Token missing" });

    const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET);
    await authRepo.verifyEmail(decoded.email);

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(400).json({ error: "Invalid or expired token" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    await authUseCase.resetPasswordRequest(req.body.email);
    res.json({ message: "Reset link sent if email exists" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    await authUseCase.resetPassword(req.params.token, req.body.password);
    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
