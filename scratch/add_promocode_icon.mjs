
import mongoose from 'mongoose';
import SidebarIcon from '../models/SidebarIcon.mjs';

async function run() {
    try {
        await mongoose.connect('mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority');
        
        const result = await SidebarIcon.updateOne(
            { name: 'Promo Codes' },
            { 
                $set: { 
                    activeIcon: '/assests/sidebar/promocode-active.png', 
                    inactiveIcon: '/assests/sidebar/promocode-inactive.png', 
                    order: 17 
                } 
            },
            { upsert: true }
        );
        
        console.log('Promo Codes icon added/updated in DB:', result);
    } catch (error) {
        console.error('Error adding Promo Codes icon:', error);
    } finally {
        process.exit();
    }
}
run();
