
import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
    roleName: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: false
    },
    permissions: {
        type: [String],
        enum: [
            'Dashboard',
            'Photographers',
            'Customers',
            'Bookings',
            'Payments',
            'Services',
            'Quotes',
            'Commission',
            'Subscribers',
            'Roles'
        ],
        default: []
    }
}, { timestamps: true });

export default mongoose.model('Role', roleSchema);
