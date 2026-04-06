import mongoose from "mongoose";

const editingPlanSchema = new mongoose.Schema({
    planName:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    features:{
        type:Array,
        required:true
    },
    planCategory:{
        type:String,
        required:true
    }
});

export default mongoose.model("EditingPlan", editingPlanSchema);

