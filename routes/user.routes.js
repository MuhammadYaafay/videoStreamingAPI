import express from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js"
import cloudinary from "../config/cloudinary.confg.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const uploadImage = await cloudinary.uploader.upload(req.files.logoUrl.tempFilePath);

        const newUser = new User({
            _id: new mongoose.Types.ObjectId(),
            channelName: req.body.channelName,
            email: req.body.email,
            phone: req.body.phone,
            password: hashedPassword,
            logoUrl: uploadImage.secure_url,
            logoId: uploadImage.public_id,
            subscribers: 0,
            subscribedChannels: []
        });

        const user = await newUser.save();

        res.status(201).json({
            message: "User created successfully",
            user
        });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({
            message: "Something went wrong",
            error: err.message
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email })
        if (!existingUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const isValid = await bcrypt.compare(req.body.password, existingUser.password);

        if (!isValid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign({
            _id: existingUser._id,
            channelName: existingUser.channelName,
            email: existingUser.email,
            phone: existingUser.phone,
            logoUrl: existingUser.logoUrl,
            logoId: existingUser.logoId
        }, process.env.JWT_TOKEN, { expiresIn: "10d" })

        res.status(200).json({
            _id: existingUser._id,
            channelName: existingUser.channelName,
            email: existingUser.email,
            phone: existingUser.phone,
            logoUrl: existingUser.logoUrl,
            logoId: existingUser.logoId,
            token: token,
            subscribers: existingUser.subscribers,
            subscribedChannels: existingUser.subscribedChannels,
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Something went wrong", message: error.message });
    }
})



export default router;