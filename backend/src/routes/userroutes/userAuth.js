import express from "express";
import { signup, signIn, verifyEmail,resendVerification,signOut,setPasswordWithForgetLink,
    changePasswordWithOldPassword, forgetPassword,userDetailsById,updateUserBio 
} from "../../controllers/authControllers/userController.js";
import { authenticate } from "../../middlewares/autentication.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signIn);
router.post("/verifyEmail", verifyEmail);
router.get("/resend-verification", resendVerification);
router.put("/signout", authenticate, signOut);
router.put("/set-password-with-forget-link", setPasswordWithForgetLink);
router.put("/change-password-with-old-password",authenticate,changePasswordWithOldPassword);
router.get("/user-details", authenticate, userDetailsById);
router.put("/update-user-bio", authenticate, updateUserBio);
router.patch("/forget-password", forgetPassword); 



export default router;