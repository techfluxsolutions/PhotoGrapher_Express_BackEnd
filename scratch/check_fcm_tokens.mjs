
import mongoose from 'mongoose';
import Photographer from '../models/Photographer.mjs';

async function run() {
    try {
        await mongoose.connect('mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority');
        
        const count = await Photographer.countDocuments({ fcmToken: { $ne: null, $ne: "" } });
        console.log(`Total photographers with FCM tokens: ${count}`);

        if (count > 0) {
            const photographers = await Photographer.find({ fcmToken: { $ne: null, $ne: "" } })
                .limit(5)
                .select('basicInfo.fullName mobileNumber fcmToken');
            
            photographers.forEach(p => {
                console.log(`- ${p.basicInfo?.fullName} (${p.mobileNumber}): Token starts with ${p.fcmToken.substring(0, 10)}...`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}
run();
