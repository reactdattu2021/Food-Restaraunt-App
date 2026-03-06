import admins from "../../models/admins/adminsSchema.js";
import { generateUserToken } from "../../middlewares/autentication.js";
import { sendEmail } from "../../utils/sentMails.js";
import { AdminForgetPassword } from "../../utils/emailTemplate.js";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin Signup Controller
export const adminSignup = async (req, res) => {
  try {
    const { email, name, password } = req.body;
    //fields check
    if (!email || !name || !password) {
      const field = !email ? "email" : !name ? "name" : "password";

      return res.status(400).json({
        success: false,
        field,
        message: `${field} is required`,
      });
    }
    //email check
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "Invalid email format",
      });
    }
    //duplicate email check
    const existingAdmin = await admins.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "An account with this email already exists",
      });
    }
    //password check
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: !password
          ? "Password is required"
          : "Password must be at least 6 characters long",
      });
    }
    const newAdmin = await admins.create({ email, name, password, status: "active" });
    if (!newAdmin) {
      const error = new Error(
        "Unable to create account, please contact the support team"
      );
      error.statuscode = 500;
      error.status = "Database Error";
      return next(error);
    }
    return res.status(201).json({
      success: true,
      statuscode: 201,
      message: "Admin account created successfully please login",
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "internal server error during signup", details: error.message });
  }
};
// Admin Login Controller
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      const error = new Error("All fields are required");
      error.statuscode = 400;
      error.status = "Bad Request";
      return res.status(400).json({ success: false, message: error.message });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error("Invalid or missing email address");
      error.statuscode = 401;
      error.status = "Bad Request";
      return res.status(401).json({ success: false, message: error.message });
    }

    // Find admin by email
    const admin = await admins
      .findOne({ email })
      .select("password name email accountType status");

    if (!admin) {
      const error = new Error("Incorrect email user not found this email is not registered");
      error.statuscode = 404;
      error.status = "Not Found";
      return res.status(404).json({ success: false, message: error.message });
    }

    // Check if role is admin
    if (admin.accountType !== "admin") {
      const error = new Error("You are not authorized to access this resource only admin can access this resource");
      error.statuscode = 403;
      error.status = "Unauthorized";
      return res.status(403).json({ success: false, message: error.message });
    }

    // Check password existence
    if (!admin.password) {
      const error = new Error("Password not set for this account please contact the support team");
      error.statuscode = 400;
      error.status = "Bad Request";
      return res.status(400).json({ success: false, message: error.message });
    }

    // Validate password
    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      const error = new Error("Incorrect password");
      error.statuscode = 401;
      error.status = "Unauthorized";
      return res.status(401).json({ success: false, message: error.message });
    }

    // Check account status
    if (admin.status === "inactive") {
      const error = new Error("Account is inactive, please verify and contact to support team");
      error.statuscode = 403;
      error.status = "Bad Request";
      return res.status(403).json({ success: false, message: error.message });
    }

    // Generate JWT token
    const token = generateUserToken(admin);

    // Save login expiry time
    admin.verify_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await admin.save();

    // Success response
    return res.status(200).json({
      success: true,
      statuscode: 200,
      message: "Login successful",
      JWTtoken: token,
      username: `${admin.name} `,
      userID: admin._id,
      role: admin.accountType,
    });
  } catch (error) {
    const err = new Error("Internal Server Error while logging in");
    err.statuscode = 500;
    err.status = error.message;
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const changePassword = async (req, res) => {
  try {
    const { oldpassword, newpassword } = req.body;

    // 1️⃣ Check input
    if (!oldpassword || !newpassword) {
      return res.status(400).json({
        success: false,
        message: "Both fields are required or mismatched field names",
      });
    }

    // 2️⃣ Get user by ID from JWT
    let admin;
    try {
      admin = await admins.findById(req.user._id).select("+password");
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "User does not exist",
        });
      }
    } catch (error) {
      console.error("Database query error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error while fetching user",
      });
    }

    // 3️⃣ Verify old password
    if (!(await admin.comparePassword(oldpassword))) {
      return res.status(401).json({
        success: false,
        message: "Incorrect old password",
      });
    }

    // 4️⃣ Prevent same password reuse
    if (await admin.comparePassword(newpassword)) {
      return res.status(401).json({
        success: false,
        message: "New password cannot be same as old password",
      });
    }

    // 5️⃣ Save new password
    admin.password = newpassword;
    await admin.save();

    // 6️⃣ Success response
    return res.status(200).json({
      success: true,
      message: "Password updated successfully. Please login again.",
    });

  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error while changing password",
    });
  }
};
export const adminforgetpassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    let user;
    try {
      user = await admins.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "No account found with this email in database" });
      }
    } catch (error) {
      
      return res.status(500).json({ message: "Database error while fetching user", details: error.message });
    }

    const fullname = `${user.name}`;
    const role = user.accountType;

    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      html: AdminForgetPassword(fullname, email, role),
    });

    return res.status(200).json({
      success: true,
      statuscode: 200,
      message: "Password reset link sent successfully",
    });

  } catch (error) {
    
    return res.status(500).json({ message: "Internal Server Error",details: error.message });
  }
};
export const adminsetnewpassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address wrong format" });
    }

    const user = await admins.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found in db" });
    }

    user.password = password;
    await user.save(); // hashed by pre-save middleware

    return res.status(200).json({
      success: true,
      statuscode: 200,
      message: "Password updated successfully, Please Login",
    });

  } catch (error) {
    return res.status(error.statuscode || 500).json({
      message: error.message || "Internal Server Error",
    });
  }
};
