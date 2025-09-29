

class RoleMiddleware {
  constructor() {
  }
    requireRole(role) {
    return (req, res, next) => {
      if (!req.user || req.user.role !== role) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: You don't have the required role to access this resource",
        });
      } 
        next();
    };
  }
    static authorizeRole(role) {
    return (req, res, next) => {
      if (!req.user || req.user.role !== role) {
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