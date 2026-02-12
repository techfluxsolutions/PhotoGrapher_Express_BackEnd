
import mongoose from 'mongoose';

const sidebarIconSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    activeIcon: {
        type: String,
        required: true,
    },
    inactiveIcon: {
        type: String,
        required: true,
    },
}, { timestamps: true });

export default mongoose.model('SidebarIcon', sidebarIconSchema);
