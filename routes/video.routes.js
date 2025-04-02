import express from "express";
import mongoose from "mongoose";

import Video from "../models/video.model.js"
import cloudinary from "../config/cloudinary.confg.js";
import { checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/upload", checkAuth, async (req, res) => {
    try {
        const { title, description, category, tags } = req.body
        if (!req.files || !req.files.video || !req.files.thumbnail) {
            return res.status(400).json({ message: "Please select a video and thumbnail" })
        }

        const videoUpload = await cloudinary.uploader.upload(req.files.video.tempFilePath, {
            resource_type: "video",
            folder: "videos",
        })
        const thumbnailUpload = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath, {
            folder: "thumbnails",
        })

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
        })

        await newVideo.save(); //for saving in db


        res.status(201).json({ message: "Video uploaded successfully", video: newVideo })

    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Error uploading video", message: error.message })
    }
})

router.put("/update/:id", checkAuth, async (req, res) => {
    try {
        const { title, description, category, tags } = req.body;
        const videoId = req.params.id;

        let video = await Video.findById(videoId);
        if (!video) {
            res.status(404).json({ error: "Videos not found" })
        }

        if (video.user_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: "unauthorized" })
        }
        if (req.files && req.files.thumbnail) {
            await cloudinary.uploader.destroy(video.thumbnailId);
            const thumbnailUpload = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath, {
                folder: "thumbnails",
            })

            video.thumbnailUrl = thumbnailUpload.secure_url;
            video.thumbnailId = thumbnailUpload.public_id;
        }
        video.title = title || video.title;
        video.description = description || video.description;
        video.category = category || video.category;
        video.tags = tags ? tags.split(",") : video.tags;

        await video.save();
        res.status(200).json({ message: "Video updated successfully", video })
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Error updating video", message: error.message })
    }
})

export default router; 