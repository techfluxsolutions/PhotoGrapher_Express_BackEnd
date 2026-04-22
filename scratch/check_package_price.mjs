
import mongoose from 'mongoose';
import ServiceBooking from '../models/ServiceBookings.mjs';

async function checkPackages() {
  await mongoose.connect("mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority");
  
  const hourly = await ServiceBooking.findOne({
    hourlyPackages: { $exists: true, $not: { $size: 0 } }
  });
  
  if (hourly) {
    console.log("Hourly Package Sample:", JSON.stringify(hourly.hourlyPackages[0], null, 2));
    const firstPkg = hourly.hourlyPackages[0];
    if (firstPkg.services && firstPkg.services.length > 0) {
      console.log("First Service:", firstPkg.services[0]);
      console.log("Price Type:", typeof firstPkg.services[0].price);
    }
  } else {
    console.log("No hourly bookings found");
  }

  const editing = await ServiceBooking.findOne({
    editingPackages: { $exists: true, $not: { $size: 0 } }
  });

  if (editing) {
    console.log("Editing Package Sample:", JSON.stringify(editing.editingPackages[0], null, 2));
    const firstPkg = editing.editingPackages[0];
    if (firstPkg.services && firstPkg.services.length > 0) {
       console.log("First Service (Editing):", firstPkg.services[0]);
       console.log("Price Type (Editing):", typeof firstPkg.services[0].price);
    }
  } else {
    console.log("No editing bookings found");
  }

  process.exit();
}

checkPackages();
