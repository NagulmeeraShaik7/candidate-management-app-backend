// exam.route.js
import express from "express";
import examController from "../controllers/exam.controller.js";
import AuthMiddleware from "../../../middleware/auth.middleware.js";
import RoleMiddleware from "../../../middleware/role.middleware.js";

const router = express.Router();
router.use(AuthMiddleware.authenticate);

router.use(RoleMiddleware.authorize(['admin', 'user']));

router.post("/generate", examController.generate);
router.get("/:id", examController.get);
router.post("/:id/submit", examController.submit);
router.get("/:id/result", examController.result);

export default router;