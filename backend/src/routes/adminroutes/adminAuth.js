import express from "express";
const router = express.Router();
import { adminAuthenticate } from "../../middlewares/autentication.js";
import { adminSignup, adminLogin,changePassword,adminforgetpassword,adminsetnewpassword,getadmindata
    ,adminProfileUpdate
 } from "../../controllers/authControllers/adminController.js";
router.post("/signup", adminSignup);
router.post("/login", adminLogin);
router.put("/change-password", adminAuthenticate, changePassword);
router.post("/forget-password", adminforgetpassword);
router.post("/set-new-password", adminsetnewpassword);
router.get("/profile", adminAuthenticate, getadmindata);
router.put("/profile-update", adminAuthenticate, adminProfileUpdate);
export default router;