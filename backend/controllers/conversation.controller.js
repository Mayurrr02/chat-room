import Conversation from "../models/conversation.model.js";

export const getActiveConversations = async (req, res) => {
  try {
    // req.user._id comes from your authentication middleware (e.g., JWT verification)
    const loggedInUserId = req.user._id;

    // Find all conversations where the current user is in the participants array
    const conversations = await Conversation.find({
      participants: { $in: [loggedInUserId] },
    }).populate("participants", "-password"); // Get user details, but exclude their passwords

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getActiveConversations: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};