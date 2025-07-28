import express from "express";
import {
  registerUser,
  loginUser,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword
} from "../controllers/auth.controller.mjs";
import { authenticateToken } from "../../../middleware/auth.middleware.mjs";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshToken);
router.get("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);


export default router;
