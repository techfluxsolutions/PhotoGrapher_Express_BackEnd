
import SidebarIcon from '../../models/SidebarIcon.mjs';

class SidebarIconController {
    async getAll(req, res, next) {
        try {
            const icons = await SidebarIcon.find().sort({ order: 1 }).lean();

            // Construct base URL from request or fallback
            // Assuming the images are statically served at root/assests or similar
            // If BASE_URL is set in environment, use that.
            let baseUrl = process.env.BASE_URL;
            if (!baseUrl) {
                baseUrl = `${req.protocol}://${req.get('host')}`;
            }

            // Map over icons to prepend base URL if needed
            const iconsWithUrl = icons.map(iconObj => {
                // Prepend base URL if not already absolute
                if (iconObj.activeIcon && !iconObj.activeIcon.startsWith('http')) {
                    iconObj.activeIcon = `${baseUrl}${iconObj.activeIcon}`;
                }
                if (iconObj.inactiveIcon && !iconObj.inactiveIcon.startsWith('http')) {
                    iconObj.inactiveIcon = `${baseUrl}${iconObj.inactiveIcon}`;
                }
                return iconObj;
            });

            res.status(200).json({
                success: true,
                data: iconsWithUrl,
            });
        } catch (error) {
            next(error);
        }
    }

    async seed(req, res, next) {
        try {
            const data = [
                {
                    name: "Dashboard",
                    activeIcon: "/assests/sidebar/dashboard-active.png",
                    inactiveIcon: "/assests/sidebar/dashboard-inactive.png",
                    order: 1
                },
                {
                    name: "Shoot Booking",
                    activeIcon: "/assests/sidebar/camera-active.png",
                    inactiveIcon: "/assests/sidebar/camera-inactive.png",
                    order: 2
                },
                {
                    name: "My Quote",
                    activeIcon: "/assests/sidebar/quote-active.png",
                    inactiveIcon: "/assests/sidebar/quote-inactive.png",
                    order: 3
                },
                {
                    name: "Services",
                    activeIcon: "/assests/sidebar/service-active.png",
                    inactiveIcon: "/assests/sidebar/service-inactive.png",
                    order: 4
                },
                {
                    name: "Payments",
                    activeIcon: "/assests/sidebar/payment-active.png",
                    inactiveIcon: "/assests/sidebar/payment-inactive.png",
                    order: 5
                },
                {
                    name: "Customers",
                    activeIcon: "/assests/sidebar/customer-active.png",
                    inactiveIcon: "/assests/sidebar/customer-inactive.png",
                    order: 6
                },
                {
                    name: "Subscribers",
                    activeIcon: "/assests/sidebar/subscribers-active.png",
                    inactiveIcon: "/assests/sidebar/subscribers-inactive.png",
                    order: 7
                },
                {
                    name: "Photographers",
                    activeIcon: "/assests/sidebar/photographer-active.png",
                    inactiveIcon: "/assests/sidebar/photographer-inactive.png",
                    order: 8
                },
                {
                    name: "Roles",
                    activeIcon: "/assests/sidebar/role-active.png",
                    inactiveIcon: "/assests/sidebar/role-inactive.png",
                    order: 9
                },
                {
                    name: "Commission",
                    activeIcon: "/assests/sidebar/commission-active.png",
                    inactiveIcon: "/assests/sidebar/commission-inactive.png",
                    order: 10
                },
                {
                    name: "Staff",
                    activeIcon: "/assests/sidebar/staff-active.png",
                    inactiveIcon: "/assests/sidebar/staff-inactive.png",
                    order: 11
                },
                {
                    name: "Queries",
                    activeIcon: "/assests/sidebar/queries-active.png",
                    inactiveIcon: "/assests/sidebar/queries-inactive.png",
                    order: 12
                },
                {
                    name: "Storage Management",
                    activeIcon: "/assests/sidebar/storageManagement-active.png",
                    inactiveIcon: "/assests/sidebar/storageManagement-inactive.png",
                    order: 13
                }
            ];

            await SidebarIcon.deleteMany({}); // Clear existing data
            const createdIcons = await SidebarIcon.insertMany(data);

            res.status(201).json({
                success: true,
                message: "Sidebar icons seeded successfully",
                data: createdIcons,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new SidebarIconController();
