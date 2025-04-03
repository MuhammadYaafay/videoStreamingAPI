import express from "express";
import mongoose from "mongoose";

import { checkAuth } from "../middleware/auth.middleware.js";
import Comment from "../models/comment.model.js";
import Video from "../models/video.model.js";

const router = express.Router();

router.post("/new", checkAuth, async (req, res) => {
  try {
    const { video_id, commentText } = req.body;

    if (!video_id || !commentText) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }
    const newComment = new Comment({
      _id: new mongoose.Types.ObjectId(),
      video_id,
      commentText,
      user_id: req.user._id,
    });
    await newComment.save();
    res.status(201).json({
      message: "Comment created successfully",
      comment: newComment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to create comment" });
  }
});

router.delete("/:commentId", checkAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (comment.user_id.toString() !== req.user._id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this comment" });
    }
    await Comment.findByIdAndDelete(commentId);
    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
});

router.put("/:commentId", checkAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { commentText } = req.body;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (comment.user_id.toString() !== req.user._id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this comment" });
    }
    comment.commentText = commentText;
    await comment.save();
    res.status(200).json({ message: "Comment updated successfully", comment });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to update comment" });
  }
});

router.get("/:videoId", checkAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    const comments = await Comment.find(
        {video_id: videoId}
    ).populate("user_id", "channelName logoUrl").sort({createdAt: -1});

    if (!comments) {
      return res.status(404).json({ message: "No comments found" });
    }
    res.status(200).json({ comments });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get comments" });
  }
});

export default router;
