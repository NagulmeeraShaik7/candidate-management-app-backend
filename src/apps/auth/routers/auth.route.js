import express from "express";
import AuthRepository from "../repositories/auth.repository.js";
import AuthUsecase from "../usecases/auth.usecase.js";
import AuthController from "../controllers/auth.controller.js";
import { validateRegister, validateLogin } from "../../../middleware/auth.validation.js";

const router = express.Router();

// Dependency Injection
const authRepository = new AuthRepository();
const authUsecase = new AuthUsecase(authRepository);
const authController = new AuthController(authUsecase);

/* POST /api/auth/register */
router.post("/register", validateRegister, authController.register);

/* POST /api/auth/login */
router.post("/login", validateLogin, authController.login);

/* POST /api/auth/logout */
router.post("/logout", authController.logout);

export default router;
