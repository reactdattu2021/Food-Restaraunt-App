import users from "../../models/users/usersSchema.js";
import mongoose from "mongoose";
import {
  generateUserToken,
  authenticate,
} from "../../middlewares/autentication.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import { sendEmail } from "../../utils/sentMails.js";
import { conformSignup,ForgetPassword } from "../../utils/emailTemplate.js";
import { customencrypt, customdecrypt } from "../../utils/cryptoUtils.js";

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // =========================
    // BASIC VALIDATIONS
    // =========================
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        statuscode: 400,
      });
    }

    // =========================
    // EMAIL VALIDATION
    // =========================
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address format please provide a valid email",
        statuscode: 400,
      });
    }
    //password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
        statuscode: 400,
      });
    }

    // =========================
    // CHECK EXISTING USER
    // =========================
    const existingUser = await users.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "You are already a registered user. Please go to login.",
        statuscode: 409,
      });
    }

    const newUser = await users.create({
      name: name.trim(),
      password: password.trim(),
      email: email.toLowerCase().trim(),
    });
    // generate encrypted token
    const encrypted = customencrypt(newUser._id.toString());

    // send verification email
    await sendEmail({
      to: newUser.email,
      subject: "Foodie Email Verification Link",
      html: conformSignup(newUser.name, encrypted, newUser.email),
    });
    // const verifyLink = `${process.env.BASE_URL}/api/auth/verify-email?token=${verifyToken}`;

    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      statuscode: 201,
      data: {
        userID: newUser._id,
        name: newUser.name,
        email: newUser.email,
        status: newUser.status,
        encryptedID: encrypted,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating user account",
      statuscode: 500,
      details: error.message,
    });
  }
};
export const verifyEmail = async (req, res) => {
  try {
    const { email, encryptedID } = req.body;

    if (!email || !encryptedID) {
      return res.status(401).json({
        success: false,
        message: "All fields are required",
      });
    }

    // ✅ Email regex validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return res.status(401).json({
        success: false,
        message: "Invalid email format",
        email,
      });
    }

    const decryptedId = customdecrypt(encryptedID);

    if (!decryptedId) {
      return res.status(400).json({
        success: false,
        message: "Invalid or corrupted verify link",
      });
    }

    const user_response = await users
      .findOne({ email, _id: decryptedId })
      .select("status verify_expiry email name");

    if (!user_response) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user_response.status === "active") {
      return res.status(401).json({
        success: false,
        message: "Account already in active state",
        status: user_response.status,
      });
    }

    if (user_response.status === "blocked") {
      return res.status(401).json({
        success: false,
        message:
          "Account Blocked, contact our Team at supportsehatmitar@gmail.com",
      });
    }

    // if (user_response.account_Status !== "inactive") {
    //   return res.status(401).json({
    //     success: false,
    //     message:
    //       "Account temporarily deactivated, contact our Team at supportsehatmitar@gmail.com",
    //   });
    // }

    // ✅ Activate account
    user_response.status = "active";
    await user_response.save();

    if (user_response.status !== "active") {
      return res.status(409).json({
        success: false,
        message: "Unable to Activate Account, try again",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account verified successfully, please login",
      status: user_response.status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const user = await users
      .findOne({ email })
      .select("status verify_expiry email name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Account already verified",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Account blocked. Contact support.",
      });
    }

    // generate new expiry
    user.verify_expiry = new Date(Date.now() + 5 * 60 * 1000);

    const encrypted = customencrypt(user._id.toString());

    await sendEmail({
      to: user.email,
      subject: "Foodie Email Verification Link",
      html: conformSignup(user.name, encrypted, user.email),
    });

    await user.save();

    return res.status(200).json({
      success: true,
      message: "New verification email sent",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const signIn = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and Password are required",
    });
  }

  try {
    const user_response = await users.findOne({ email: email });

    if (!user_response) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    if (user_response.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is Inactive. Please verify your email.",
      });
    }

    const isMatch = await bcrypt.compare(password, user_response.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const token = generateUserToken(user_response);

    return res.status(200).json({
      success: true,
      statuscode: 200,
      message: "Login successfully",
      JWTtoken: token,
      userID: user_response._id,

      email: user_response.email,

      name: user_response.name,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const changePasswordWithOldPassword = async (req, res) => {
  const { oldpassword, newpassword, confirmpassword } = req.body;

  // Validation
  if (!oldpassword || !newpassword || !confirmpassword) {
    return res.status(400).json({
      success: false,
      message: "All fields are required or field names miss match",
    });
  }

  if (newpassword !== confirmpassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirm password do not match",
    });
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newpassword)) {
    return res.status(400).json({
      success: false,
      message:
        "Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character.",
    });
  }

  try {
    const user = await users.findById(req.user._id).select("password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist",
      });
    }

    const isPassword = await bcrypt.compare(oldpassword, user.password);
    if (!isPassword) {
      return res.status(401).json({
        success: false,
        message: "Incorrect old password",
      });
    }

    const isSamePassword = await bcrypt.compare(newpassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password should not be same as old password",
      });
    }

    user.password = newpassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully, Please log in.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while changing password",
      details: error.message,
    });
  }
};
export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Find user
    const user_response = await users.findOne({ email });

    if (!user_response) {
      return res.status(200).json({
        success: true,
        message: "email account not found with this email.",
      });
    }

    // Create token with userId, email, and expiry
    const resetData = {
      userId: user_response._id.toString(),
      email: email,
      expiry: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const encryptedToken = customencrypt(JSON.stringify(resetData));

    // Send email
    await sendEmail({
      to: user_response.email,
      subject: "Password Reset link Foodie",
      html: ForgetPassword(user_response.name, encryptedToken),
    });

    return res.status(200).json({
      success: true,
      message:
        "A password reset link has been sent to your email. It will expire in 15 minutes.",
        encryptedToken: encryptedToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while processing password reset",
      details: error.message,
    });
  }
};
export const setPasswordWithForgetLink = async (req, res) => {
  try {
    const { token, newpassword } = req.body;

    // 1️⃣ Validate inputs
    if (!token || !newpassword) {
      return res.status(400).json({
        success: false,
        message: "Reset token and password are required or miss matching field names",
      });
    }

    // 2️⃣ Decrypt token
    let resetData;

    try {
      const decryptedString = customdecrypt(token);
      resetData = JSON.parse(decryptedString);
    } catch (decryptError) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset link",
      });
    }

    // 3️⃣ Check token expiry
    if (!resetData.expiry || resetData.expiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Password reset link has expired. Please request a new one.",
      });
    }

    // 4️⃣ Validate userId format
    if (!mongoose.Types.ObjectId.isValid(resetData.userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID in token",
      });
    }

    // 5️⃣ Password strength validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(newpassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters including uppercase, lowercase, number and special character",
      });
    }

    // 6️⃣ Find user
    const user_response = await users
      .findOne({
        _id: resetData.userId,
        email: resetData.email,
      })
      .select("password status email name");

    if (!user_response) {
      return res.status(404).json({
        success: false,
        message: "User not found or token mismatch",
      });
    }

    // 7️⃣ Check account status
    if (user_response.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please verify your email first.",
      });
    }

    // 8️⃣ Prevent password reuse
    const isSamePassword = await bcrypt.compare(
      newpassword,
      user_response.password,
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your old password.",
      });
    }

    // 9️⃣ Update password
    user_response.password = newpassword;
    await user_response.save();

    return res.status(200).json({
      success: true,
      statuscode: 200,
      message:
        "Your password has been successfully updated. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Set Password Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error while doing password reset with forget link",
    });
  }
};
export const userDetailsById = async (req, res) => {
  try {
    const id = req.user._id;// takinguser ID is available in req.user from/after authentication middleware

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Find user
    const user_response = await users
      .findById(id)
      

    if (!user_response) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      statuscode: 200,
      username: user_response.name,
      email: user_response.email,
      userID: user_response._id,
      userstatus: user_response.status,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while fetching user details",
      error: error.message,
    });
  }
};
export const updateUserBio = async (req, res) => {
  try {
    const allowed = ["name", "email"];
    const updatedData = {};
    
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        updatedData[field] = req.body[field];
      }
    });
    
    const updatedUser_response = await users.findByIdAndUpdate(
      req.user._id,
      updatedData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser_response) {
      return res.status(404).json({
        success: false,
        message: "User not found or not updated",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while updating user profile",
      details: error.message,
    });
  }
};
export const setNewPasswordWithGoogleId = async (req, res) => {
  const { newpassword, confirmpassword } = req.body;

  // Validation
  if (!newpassword || !confirmpassword) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  if (newpassword !== confirmpassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirm password do not match",
    });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newpassword)) {
    return res.status(400).json({
      success: false,
      message: "Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character.",
    });
  }

  try {
    const user = await users.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist",
      });
    }

    user.password = newpassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password set successfully, Please log in.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while setting password",
      details: error.message,
    });
  }
};
export const signOut = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "user logged out successfully",
    });
  } catch (error) {
    const err = new Error("Internal Server Error");
   
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while logging out",
      details: error.message,
    });
  }
};
