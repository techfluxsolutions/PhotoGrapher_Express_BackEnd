import Photographer from "../../models/Photographer.mjs";
import razorpayInstance from "../../Config/razorpay.mjs";

class RazorpayController {
  // Generates a Razorpay Linked Account for the Photographer
  async createRazorpayAccount(req, res, next) {
    try {
      const photographerId = req.user.id; // From authMiddleware

      const photographer = await Photographer.findById(photographerId);
      if (!photographer) {
        return res.status(404).json({ success: false, message: "Photographer not found" });
      }

      // Check if already created
      if (photographer.razorpayAccountId) {
        return res.status(400).json({
          success: false,
          message: "Razorpay account is already created",
          razorpayAccountId: photographer.razorpayAccountId
        });
      }

      // Create Razorpay Linked Account
      // Reference: https://razorpay.com/docs/api/route/#create-an-account
      const accountData = {
        type: 'route',
        email: photographer.email,
        phone: photographer.mobileNumber || photographer.basicInfo?.phone,
        legal_business_name: photographer.bank_account_holder || photographer.basicInfo?.fullName || photographer.username || "Photographer",
        business_type: "individual", // Default to individual
        contact_name: photographer.basicInfo?.fullName || photographer.username || "Photographer",
        profile: {
          category: "ecommerce",
          subcategory: "digital_goods"
        }
      };

      const account = await razorpayInstance.accounts.create(accountData);

      // Save the account ID to the photographer document
      photographer.razorpayAccountId = account.id;
      await photographer.save();

      return res.status(201).json({
        success: true,
        message: "Razorpay account created successfully",
        razorpayAccountId: account.id,
        accountDetails: account
      });
    } catch (error) {
      console.error("Error creating Razorpay account:", error);
      res.status(500).json({ success: false, message: "Failed to create Razorpay account", error: error.message || error.description });
    }
  }
}

export default new RazorpayController();
