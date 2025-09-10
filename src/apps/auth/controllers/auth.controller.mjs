import { asyncHandler } from "../../../middleware/error.middleware.mjs";

class AuthController {
  constructor(authUsecase) {
    this.authUsecase = authUsecase;

    // Bind methods
    this.register = asyncHandler(this.register.bind(this));
    this.login = asyncHandler(this.login.bind(this));
    this.logout = asyncHandler(this.logout.bind(this));
  }

  async register(req, res) {
    const { email, password, name } = req.body;
    const { user, token } = await this.authUsecase.register({ email, password, name });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user, token },
    });
  }

  async login(req, res) {
    const { email, password } = req.body;
    const { user, token } = await this.authUsecase.login({ email, password });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user, token },
    });
  }

  async logout(req, res) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    await this.authUsecase.logout(token);

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  }
}

export default AuthController;