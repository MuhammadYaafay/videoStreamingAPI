import express from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.confg.js";
import { checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const uploadImage = await cloudinary.uploader.upload(
      req.files.logoUrl.tempFilePath
    );

    const newUser = new User({
      _id: new mongoose.Types.ObjectId(),
      channelName: req.body.channelName,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
      logoUrl: uploadImage.secure_url,
      logoId: uploadImage.public_id,
      subscribers: 0,
      subscribedChannels: [],
    });

    const user = await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isValid = await bcrypt.compare(
      req.body.password,
      existingUser.password
    );

    if (!isValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        _id: existingUser._id,
        channelName: existingUser.channelName,
        email: existingUser.email,
        phone: existingUser.phone,
        logoUrl: existingUser.logoUrl,
        logoId: existingUser.logoId,
      },
      process.env.JWT_TOKEN,
      { expiresIn: "10d" }
    );

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
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Something went wrong", message: error.message });
  }
});

router.put("/updateProfile", checkAuth, async (req, res) => {
  try {
    const { channelName, phone } = req.body;
    let updatedData = { channelName, phone };

    if (req.files && req.files.logoUrl) {
      const uploadImage = await cloudinary.uploader.upload(
        req.files.logoUrl.tempFilePath
      );
      updatedData.logoUrl = uploadImage.secure_url;
      updatedData.logoId = uploadImage.public_id;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updatedData,
      { new: true }
    );

    res
      .status(200)
      .json({ message: "Profile updated successfully", updatedUser });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Something went wrong", message: error.message });
  }
});

router.post("/subscribe", checkAuth, async (req, res) => {
  try {
    const { channelId } = req.body;
    if (req.user._id === channelId) {
      return res
        .status(400)
        .json({ error: "You cannot subscribe to yourself" });
    }

    // Check if the user is already subscribed to the channel
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found" });
    }

    if (currentUser.subscribedChannels.includes(channelId)) {
      return res
        .status(400)
        .json({ error: "You are already subscribed to this channel" });
    }

    // Add the channel to the current user's subscribed channels
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { subscribedChannels: channelId } },
      { new: true }
    );

    // Only increment the subscriber count of the subscribed user if subscription was successful
    let subscribedUser = null;
    if (updatedUser) {
      subscribedUser = await User.findByIdAndUpdate(
        channelId,
        { $inc: { subscribers: 1 } },
        { new: true }
      );
    }

    // Check if the subscribed user was found and updated successfully
    if (!subscribedUser) {
      return res.status(404).json({ error: "Subscribed user not found" });
    }

    res.status(200).json({
      message: "Subscribed successfully",
      data: {
        currentUser: updatedUser,
        subscribedUser,
      },
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Something went wrong", message: error.message });
  }
});

export default router;
