import jwt from "jsonwebtoken";

export const checkAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const decodeUser = jwt.verify(token, process.env.JWT_TOKEN);

        req.user = decodeUser;
        next(); 
    } catch (error) {
        return res.status(401).json({ error: "No token is provided" });
    }
};
