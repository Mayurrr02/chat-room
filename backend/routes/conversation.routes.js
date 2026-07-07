import express from "express";
import { getActiveConversations } from "../controllers/conversation.controller.js";
import protectRoute from "../middleware/protectRoute.js"; // Your auth middleware

const router = express.Router();

// protectRoute ensures only logged-in users can access this
router.get("/", protectRoute, getActiveConversations);

export default router;