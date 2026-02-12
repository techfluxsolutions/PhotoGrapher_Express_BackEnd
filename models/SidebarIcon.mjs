
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
    order: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export default mongoose.model('SidebarIcon', sidebarIconSchema);
