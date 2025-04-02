import express from "express";
import mongoose from "mongoose";

import Video from "../models/video.model.js";
import cloudinary from "../config/cloudinary.confg.js";
import { checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/upload", checkAuth, async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    if (!req.files || !req.files.video || !req.files.thumbnail) {
      return res
        .status(400)
        .json({ message: "Please select a video and thumbnail" });
    }

    const videoUpload = await cloudinary.uploader.upload(
      req.files.video.tempFilePath,
      {
        resource_type: "video",
        folder: "videos",
      }
    );
    const thumbnailUpload = await cloudinary.uploader.upload(
      req.files.thumbnail.tempFilePath,
      {
        folder: "thumbnails",
      }
    );

    const newVideo = new Video({
      _id: new mongoose.Types.ObjectId(),
      title,
      description,
      user_id: req.user._id,
      videoUrl: videoUpload.secure_url,
      videoId: videoUpload.public_id,
      thumbnailUrl: thumbnailUpload.secure_url,
      thumbnailId: thumbnailUpload.public_id,
      category,
      tags: tags ? tags.split(",") : [],
    });

    await newVideo.save(); //for saving in db

    res
      .status(201)
      .json({ message: "Video uploaded successfully", video: newVideo });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error uploading video", message: error.message });
  }
});

router.put("/update/:id", checkAuth, async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    const videoId = req.params.id;

    let video = await Video.findById(videoId);
    if (!video) {
      res.status(404).json({ error: "Videos not found" });
    }

    if (video.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "unauthorized" });
    }
    if (req.files && req.files.thumbnail) {
      await cloudinary.uploader.destroy(video.thumbnailId);
      const thumbnailUpload = await cloudinary.uploader.upload(
        req.files.thumbnail.tempFilePath,
        {
          folder: "thumbnails",
        }
      );

      video.thumbnailUrl = thumbnailUpload.secure_url;
      video.thumbnailId = thumbnailUpload.public_id;
    }
    video.title = title || video.title;
    video.description = description || video.description;
    video.category = category || video.category;
    video.tags = tags ? tags.split(",") : video.tags;

    await video.save();
    res.status(200).json({ message: "Video updated successfully", video });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error updating video", message: error.message });
  }
});

router.delete("/delete/:id", checkAuth, async (req, res) => {
  try {
    const videoId = req.params.id;
    let video = await Video.findById(videoId);

    if (!video) return res.status(404).json({ error: "Video not found" });

    if (video.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (video.videoId) {
      await cloudinary.uploader.destroy(video.videoId, {
        resource_type: "video",
      });
    }
    if (video.thumbnailId) {
      await cloudinary.uploader.destroy(video.thumbnailId);
    }

    await Video.findByIdAndDelete(videoId);
    res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error deleting video", message: error.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.status(200).json(videos);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error fetching videos", message: error.message });
  }
});

router.get("/myVideos", checkAuth, async (req, res) => {
  try {
    const videos = await Video.find({
      user_id: req.user._id,
    }).sort({ createdAt: -1 });
    res.status(200).json(videos);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error fetching videos", message: error.message });
  }
});

router.get("/:id", checkAuth, async (req, res) => {
  try {
    const videoId = req.params.id;
    const userId = req.user._id;

    // Use findByIdAndUpdate to add the user ID to the viewedBy array if not already present
    const video = await Video.findByIdAndUpdate(
      videoId,
      {
        $addToSet: { viewedBy: userId }, // Add user ID to viewedBy array, avoiding duplicates
      },
      { new: true } // Return the updated video document
    );

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.status(200).json(video);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error fetching video", message: error.message });
  }
});

router.get("/category/:category", async (req, res) => {
  try {
    const videos = await Video.find({
      category: req.params.category,
    }).sort({ createdAt: -1 });
    res.status(200).json(videos);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error fetching videos", message: error.message });
  }
});

router.get("/tags/:tag", async (req, res) => {
  try {
    const tag = req.params.tag;
    const videos = await Video.find({
      tags: tag,
    }).sort({ createdAt: -1 });

    res.status(200).json(videos);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error fetching videos", message: error.message });
  }
});

router.post("/like", checkAuth, async (req, res) => {
  try {
    const { videoId } = req.body;
    const userId = req.user._id;

    await Video.findByIdAndUpdate(videoId, {
      $addToSet: { likedBy: userId },
      $pull: { disLikedBy: userId }, // Remove from dislikes if previously disliked
    });
    res.status(200).json({ message: "Video liked" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error liking video", message: error.message });
  }
});

router.post("/dislike", checkAuth, async (req, res) => {
  try {
    const { videoId } = req.body;
    const userId = req.user._id;

    await Video.findByIdAndUpdate(videoId, {
      $addToSet: { disLikedBy: userId },
      $pull: { likedBy: userId }, // Remove from likes if previously liked
    });
    res.status(200).json({ message: "Video disliked" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error disliking video", message: error.message });
  }
});

export default router;
