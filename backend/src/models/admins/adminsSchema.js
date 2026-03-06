import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const adminsSchema = new mongoose.Schema({

  email: { type: String, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String, enum: ["active", "Blocked"], default: "active" },
  accountType: { type: String, enum: ["admin"], default: "admin" },
  verify_expiry: { type: Date, default: Date.now() + 24 * 60 * 60 * 1000 },

})
//compare the password  :
adminsSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

//hash all in comming password Strings :
adminsSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

export default mongoose.model("admins", adminsSchema);
