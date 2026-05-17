import mongoose from 'mongoose';
import DataLinks from '../models/DataLinks.js';
import ServiceBooking from '../models/ServiceBookings.mjs';

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect('mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority');
  console.log('Connected!');

  // Find all datalinks with category "Photographer Media"
  const datalinks = await DataLinks.find({
    category: 'Photographer Media'
  });

  console.log(`Found ${datalinks.length} datalinks with category "Photographer Media".`);

  let updatedCount = 0;

  for (const link of datalinks) {
    const bookingId = link.bookingid || link.veroaBookingId;
    if (!bookingId) continue;

    // Find the booking
    const booking = await ServiceBooking.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(bookingId) ? new mongoose.Types.ObjectId(bookingId) : null },
        { veroaBookingId: bookingId }
      ].filter(Boolean)
    });

    if (!booking || booking.serviceCategory !== 'editing') {
      continue;
    }

    const editorId = link.photographerId;
    if (!editorId) continue;

    const editorIdStr = editorId.toString();

    // Find editing packages
    const pkgs = booking.editingPackages || booking.editingbookings || [];
    const matchedPkg = pkgs.find(pkg => 
      (pkg.assignedEditors || []).some(id => id.toString() === editorIdStr)
    );

    if (matchedPkg) {
      const pkgCat = (matchedPkg.planCategory || matchedPkg.category || (matchedPkg.planName?.toLowerCase().includes("premium") ? "Premium" : "Standard")).toLowerCase();
      
      console.log(`Updating datalink ${link._id} (${link.key}): 'Photographer Media' -> '${pkgCat}' (Editor: ${editorIdStr})`);
      
      await DataLinks.updateOne(
        { _id: link._id },
        { $set: { category: pkgCat } }
      );
      
      updatedCount++;
    }
  }

  console.log(`Migration finished. Updated ${updatedCount} datalinks.`);
  process.exit(0);
}

run().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
