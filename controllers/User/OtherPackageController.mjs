// services/OtherPackagesService.js
import OtherPackages from "../models/OtherPackages.js";

class OtherPackagesService {
  // CREATE
  async createPackage(data) {
    const newPackage = new OtherPackages(data);
    return await newPackage.save();
  }

  // READ ALL
  async getAllPackages() {
    return await OtherPackages.find().sort({ createdAt: -1 });
  }

  // READ BY ID
  async getPackageById(id) {
    return await OtherPackages.findById(id);
  }

  // UPDATE
  async updatePackage(id, updateData) {
    return await OtherPackages.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  // DELETE
  async deletePackage(id) {
    return await OtherPackages.findByIdAndDelete(id);
  }

  // SEARCH BY TITLE (example of custom async method)
  async findPackageByTitle(title) {
    return await OtherPackages.findOne({ packageTitle: title });
  }
}

export default OtherPackagesService;