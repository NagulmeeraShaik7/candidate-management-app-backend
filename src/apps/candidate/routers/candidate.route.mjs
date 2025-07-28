import express from "express";
import * as controller from "../controllers/candidate.controller.mjs";
import { validateCandidate, handleValidationErrors, sanitizeSkills } from "../../../middleware/validation.middleware.mjs";
import { authenticateToken } from "../../../middleware/auth.middleware.mjs";

const router = express.Router();

router.get("/",  authenticateToken, controller.getCandidates);
router.get("/:id", authenticateToken, controller.getCandidate);
router.post("/",  authenticateToken, validateCandidate, handleValidationErrors, sanitizeSkills, controller.postCandidate);
router.put("/:id",  authenticateToken, validateCandidate, handleValidationErrors, sanitizeSkills, controller.putCandidate);
router.delete("/:id",  authenticateToken, controller.deleteCandidate);

export default router;