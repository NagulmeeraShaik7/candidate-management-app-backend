// 📁 middleware/auth.validation.mjs
import { validators } from "../utils/validation.utils.js";

export const validateRegister = (req, res, next) => {
  const { isValid, errors } = validators.isValidRegister(req.body);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      message: "Invalid register data",
      details: errors,
    });
  }
  next();
};

export const validateLogin = (req, res, next) => {
  const { isValid, errors } = validators.isValidLogin(req.body);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      message: "Invalid login data",
      details: errors,
    });
  }
  next();
};
