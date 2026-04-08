import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const logFile = 'debug_log.txt';
function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

fs.writeFileSync(logFile, "DEBUG SCRIPT STARTED\n");

const ServiceBookingSchema = new mongoose.Schema({
    client_id: mongoose.Schema.Types.ObjectId,
    status: String
}, { strict: false });

let ServiceBooking;
try {
    ServiceBooking = mongoose.model('ServiceBooking');
} catch (e) {
    ServiceBooking = mongoose.model('ServiceBooking', ServiceBookingSchema, 'servicebookings');
}

async function check() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            log("MONGODB_URI NOT FOUND IN .ENV");
            process.exit(1);
        }
        log("Connecting to URI...");
        await mongoose.connect(uri);
        log("Connected successfully");

        const bookingId = '69d4d151121a6df5362a962c';
        log("Searching for ID: " + bookingId);
        
        const b = await ServiceBooking.findById(bookingId);
        if (!b) {
            log('BOOKING_NOT_FOUND_IN_DB');
            
            const allCount = await ServiceBooking.countDocuments();
            log('Total bookings in DB: ' + allCount);
            
            const someBookings = await ServiceBooking.find().limit(5);
            log('Sample IDs in DB: ' + someBookings.map(sb => sb._id.toString()).join(', '));
        } else {
            log('BOOKING_FOUND');
            log('CLIENT_ID: ' + b.client_id);
            log('STATUS: ' + b.status);
            log('Data: ' + JSON.stringify(b, null, 2));
        }
        process.exit();
    } catch (e) {
        log("ERROR: " + e.message);
        process.exit(1);
    }
}
check();
