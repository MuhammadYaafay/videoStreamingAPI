import express from "express";
import dotenv from "dotenv";
import fileUpload from "express-fileupload"

import { ConnectDB } from "./config/db.config.js";
import userRoutes from "./routes/user.routes.js"

dotenv.config();

const app = express();
ConnectDB()

app.use(express.json());
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
}));

app.use("/api/v1/user", userRoutes)

const PORT = process.env.PORT;

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port http://localhost:${process.env.PORT}`);
});