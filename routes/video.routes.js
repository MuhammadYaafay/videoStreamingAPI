import express from "express";
import mongoose from "mongoose";

import User from "../models/user.model.js"
import Video from "../models/video.model.js"
import cloudinary from "../config/cloudinary.confg.js";

const router = express.Router();

export default router; 