import jwt from "jsonwebtoken";

class AuthMiddleware {
  static authenticate(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No authorization header provided",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET not set in environment");

      const decoded = jwt.verify(token, secret);

      // ✅ Only login tokens can access protected APIs
      if (!decoded.isLoginToken) {
        return res.status(403).json({
          success: false,
          message: "Only login tokens are authorized for this action",
        });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  }
}

export default AuthMiddleware;
