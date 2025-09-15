import express from "express";
import * as controller from "../controllers/candidate.controller.js";
import { validateCandidate, handleValidationErrors, sanitizeSkills } from "../../../middleware/validation.middleware.js";

const router = express.Router();

router.get("/", controller.getCandidates);
router.get("/:id", controller.getCandidate);
router.post("/", validateCandidate, handleValidationErrors, sanitizeSkills, controller.postCandidate);
router.put("/:id", validateCandidate, handleValidationErrors, sanitizeSkills, controller.putCandidate);
router.delete("/:id", controller.deleteCandidate);

export default router;