import express from "express";
const router = express.Router();
import { adminAuthenticate } from "../../middlewares/autentication.js";
import { adminSignup, adminLogin,changePassword,adminforgetpassword } from "../../controllers/authControllers/adminController.js";
router.post("/signup", adminSignup);
router.post("/login", adminLogin);
router.put("/change-password", adminAuthenticate, changePassword);
router.post("/forget-password", adminforgetpassword);
export default router;