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

// All routes protected
router.use(AuthMiddleware.authenticate);


router.use(RoleMiddleware.authorize(['admin']));


router.get("/",candidateController.list);
router.get("/stats/top-skills", candidateController.topSkills);
router.get("/:id", candidateController.get);
router.post("/",  validateCandidate, handleValidationErrors, sanitizeSkills, candidateController.create);
router.put("/:id", validateCandidate, handleValidationErrors, sanitizeSkills, candidateController.update);
router.delete("/:id", candidateController.remove);

export default router;
