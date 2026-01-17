import Admin from "../models/Admin.mjs";

export const chatRoleCheck = async (req, res, next) => {
    console.log("req.user", req.user);
    try {
        // 1. If User (Customer), access allow
        if (req.user.userType === "user") {
            return next();
        }

        // 2. If Admin, check existence in Admin collection
        // Since req.user.userType is undefined for Admins (based on current AuthController),
        // we must verify against the DB.
        const admin = await Admin.findById(req.user.id);
        if (admin) {
            req.user.isAdmin = true; // Flag for controller usage
            return next();
        }

        // 3. Otherwise (e.g. Photographer), deny access
        return res.status(403).json({
            success: false,
            message: "Access denied. Chat is available for Users and Admins only."
        });

    } catch (error) {
        console.error("Chat Role Check Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error during role check" });
    }
};
