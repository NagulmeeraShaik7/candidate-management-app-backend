import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default class AuthUsecase {
  constructor(authRepository) {
    this.authRepository = authRepository;
    this.saltRounds = 10;
  }

  #signJwt(payload) {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    if (!secret) throw new Error("JWT_SECRET not set in environment");
    return jwt.sign(payload, secret, { expiresIn });
  }

  async register({ email, password, name }) {
    const existing = await this.authRepository.findByEmail(email);
    if (existing) {
      const err = new Error("Email already registered. Please login instead.");
      err.name = "DuplicateEmailError";
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, this.saltRounds);
    const saved = await this.authRepository.create({ email, passwordHash, name });
    const token = this.#signJwt({ sub: saved._id, email: saved.email });

    return {
      user: {
        id: saved._id,
        email: saved.email,
        name: saved.name,
        createdAt: saved.createdAt,
      },
      token,
    };
  }

  async login({ email, password }) {
    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      const err = new Error("No account found with this email.");
      err.name = "AuthError";
      throw err;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const err = new Error("Incorrect password. Please try again.");
      err.name = "AuthError";
      throw err;
    }

    const token = this.#signJwt({ sub: user._id, email: user.email });
    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async logout(token) {
    // Optional: maintain a blacklist in DB/Redis
    return { message: "Logged out successfully. Please discard your token." };
  }
}
