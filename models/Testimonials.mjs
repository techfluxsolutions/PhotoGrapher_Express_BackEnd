import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    testimonial: {
        type : String,
        required : true,
    },
    serviceName : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Services",
        required : true,
    },
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Users",
        required : true,
    }
  },

  {
    timestamps: true,
   
  }
);
// Index
userSchema.index({ userId: 1 });
userSchema.index({ serviceName: 1 });


export default mongoose.model("Testimonial", userSchema);
