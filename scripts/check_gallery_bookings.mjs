
import mongoose from "mongoose";
import dotenv from "dotenv";
import Gallery from "../models/Gallery.mjs";
import ServiceBooking from "../models/ServiceBookings.mjs";
import fs from "fs";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
    let output = "";
    try {
        await mongoose.connect(MONGODB_URI);
        output += "Connected to MongoDB\n";

        const collections = await mongoose.connection.db.listCollections().toArray();
        output += "Collections: " + collections.map(c => c.name).join(", ") + "\n";

        const allGalleries = await Gallery.find({}).lean();
        output += `Total galleries found: ${allGalleries.length}\n`;

        const galleriesWithPhotos = allGalleries.filter(g => g.gallery && g.gallery.length > 0);
        output += `Galleries with photos: ${galleriesWithPhotos.length}\n`;
        
        if (galleriesWithPhotos.length > 0) {
            output += `First gallery data: ${JSON.stringify(galleriesWithPhotos[0], null, 2)}\n`;
            
            const bookingIds = galleriesWithPhotos.map(g => g.booking_id);
            output += `Searching for bookings with IDs: ${bookingIds.join(", ")}\n`;
            
            for (const bid of bookingIds) {
                const bStr = bid.toString();
                output += `--- Searching for ${bStr} across all collections ---\n`;
                for (const coll of collections) {
                    const found = await mongoose.connection.db.collection(coll.name).findOne({ _id: bid });
                    if (found) {
                        output += `FOUND IN ${coll.name}: ${JSON.stringify(found, null, 2)}\n`;
                    } else {
                        const foundStr = await mongoose.connection.db.collection(coll.name).findOne({ _id: bStr });
                         if (foundStr) {
                            output += `FOUND IN ${coll.name} (as string): ${JSON.stringify(foundStr, null, 2)}\n`;
                        }
                    }
                }
            }
        } else {
            output += "No galleries with photos found.\n";
        }

    } catch (error) {
        output += `Error: ${error.message}\n`;
    } finally {
        fs.writeFileSync("gallery_results.txt", output);
        await mongoose.disconnect();
    }
}

run();
