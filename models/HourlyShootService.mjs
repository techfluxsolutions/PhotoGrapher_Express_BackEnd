import mongoose from "mongoose"



const hourlyShootServiceSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    features:{
        type:Array,
        required:true
    }
})

export default mongoose.model("HourlyShootService", hourlyShootServiceSchema)
