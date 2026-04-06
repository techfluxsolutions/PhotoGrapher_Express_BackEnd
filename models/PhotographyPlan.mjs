import mongoose from "mongoose";

const photographyPlanSchema = new mongoose.Schema({
    planName:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    features:[{
        featureName:{
            type:String,
            required:true
        },
        featureDescription:{
            type:String,
            required:true
        }
    }],
    planCategory:{
        type:String,
        required:true
    }
});

export default mongoose.model("PhotographyPlan", photographyPlanSchema);