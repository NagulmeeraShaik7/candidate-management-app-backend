import express from "express";
import candidateController from "../controllers/candidate.controller.js";
import {
  validateCandidate,
  handleValidationErrors,
  sanitizeSkills,
} from "../../../middleware/validation.middleware.js";
import AuthMiddleware from "../../../middleware/auth.middleware.js";
import RoleMiddleware from "../../../middleware/role.middleware.js";


const router = express.Router();
const roleMiddleware = new RoleMiddleware();

// All routes protected
router.use(AuthMiddleware.authenticate);
//router.use(roleMiddleware.requireRole('admin'));




router.get("/", roleMiddleware.requireRole('user'), candidateController.list);
router.get("/stats/top-skills", roleMiddleware.requireRole('user'), candidateController.topSkills);
router.get("/:id", roleMiddleware.requireRole('user'), candidateController.get);
router.post("/", roleMiddleware.requireRole('admin'), validateCandidate, handleValidationErrors, sanitizeSkills, candidateController.create);
router.put("/:id", roleMiddleware.requireRole('admin'), validateCandidate, handleValidationErrors, sanitizeSkills, candidateController.update);
router.delete("/:id", roleMiddleware.requireRole('admin'), candidateController.remove);

export default router;
