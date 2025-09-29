class RoleMiddleware {
  constructor() {}

  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: No user found in request",
        });
      }

      const userRole = req.user.role;

      // Normalize to array if a single role is passed
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You don't have the required role to access this resource",
        });
      }

      next();
    };
  }

  static authorizeRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: No user found in request",
        });
      }

      const userRole = req.user.role;

      // Normalize to array if a single role is passed
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You don't have the required role to access this resource",
        });
      }

      next();
    };
  }
}

export default RoleMiddleware;
