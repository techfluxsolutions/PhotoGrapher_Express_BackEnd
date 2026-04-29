
import mongoose from 'mongoose';
import Photographer from '../models/Photographer.mjs';

async function run() {
    try {
        await mongoose.connect('mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority');
        
        const staticNumbers = ['9322046187', '9325983803', '9096698947'];
        const photographers = await Photographer.find({ mobileNumber: { $in: staticNumbers } })
            .select('basicInfo.fullName mobileNumber fcmToken');
        
        console.log('--- Test Photographers Status ---');
        photographers.forEach(p => {
            console.log(`Name: ${p.basicInfo?.fullName}`);
            console.log(`Phone: ${p.mobileNumber}`);
            console.log(`FCM Token: ${p.fcmToken ? 'PRESENT' : 'MISSING'}`);
            if (p.fcmToken) console.log(`Token Snippet: ${p.fcmToken.substring(0, 20)}...`);
            console.log('-------------------------------');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}
run();
