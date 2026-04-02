import { generateInvoicePDF, generatePartnerInvoicePDF } from "../../utils/Pdf_generator/generateInvoicePDF.mjs";
import ServiceBooking from "../../models/ServiceBookings.mjs";
import Photographer from "../../models/Photographer.mjs";

const SELLER_INFO = {
    name: "VEROA STUDIOS PRIVATE LIMITED",
    fullName: "VEROA STUDIOS PRIVATE LIMITED (Formerly known as Veroa Photography)",
    address: "Unit No. 12, Ground Floor, Sector 44, Gurgaon, Haryana - 122003",
    serviceProviderAddress: "7TH and 8TH Floor, Plot No 183, Udyog Vihar, Sector 20, Rajiv Nagar, Gurugram, Haryana - 122016",
    gstin: "06AABCU7755Q1ZK", // Placeholder GSTIN
    phone: "+91-XXXXXXXXXX",
    email: "support@veroastudioz.com",
    cin: "U74140DL2014PLC274413", // Placeholder CIN
    website: "www.veroastudioz.com",
    state: "Haryana",
    stateCode: "06"
};

export const downloadInvoice = async (req, res) => {
    try {
        const booking = await ServiceBooking.findById(req.params.bookingId)
            .populate("client_id")
            .populate("service_id");

        if (!booking) {
            // Check if it's a quote if not a booking
            return res.status(404).json({ message: "Booking not found" });
        }

        const buyerAddress = [
            booking.flatOrHouseNo,
            booking.streetName,
            booking.city,
            booking.state,
            booking.postalCode ? `${booking.postalCode}` : ""
        ].filter(Boolean).join(", ");

        const invoiceData = {
            invoiceNo: booking.veroaBookingId || `INV-${booking._id.toString().slice(-6).toUpperCase()}`,
            date: new Date(booking.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }),
            
            seller: SELLER_INFO,
            
            buyer: {
                name: booking.client_id?.username || booking.client_id?.fullName || "Client",
                address: buyerAddress || "N/A",
                gstin: "N/A",
                state: booking.state || "N/A",
                stateCode: "", // Add if available
                placeOfSupply: booking.state || "N/A"
            },
            
            items: [
                {
                    description: booking.service_id?.serviceName || booking.shootType || "Photography Service",
                    sac: "998313", // SAC for Photography services
                    amount: booking.totalAmount || 0,
                    discount: 0,
                    taxableValue: booking.totalAmount || 0,
                }
            ],
            
            total: booking.totalAmount || 0,
            taxableValueInWords: "", // You could add a number-to-words helper here
            igst: null, // Depending on state
            cgst: null,
            sgst: null
        };

        // Add GST logic if needed
        const isSameState = SELLER_INFO.state === booking.state;
        const taxableAmount = booking.totalAmount || 0;
        
        if (isSameState) {
            invoiceData.cgst = { rate: 9, amount: taxableAmount * 0.09 };
            invoiceData.sgst = { rate: 9, amount: taxableAmount * 0.09 };
        } else {
            invoiceData.igst = { rate: 18, amount: taxableAmount * 0.18 };
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Invoice-${invoiceData.invoiceNo}.pdf`
        );

        await generateInvoicePDF(invoiceData, res);
        
    } catch (err) {
        console.error("Invoice generation error:", err);
        res.status(500).json({ message: "Invoice generation failed" });
    }
};

export const downloadPartnerInvoice = async (req, res) => {
    try {
        const booking = await ServiceBooking.findById(req.params.bookingId)
            .populate("client_id")
            .populate("service_id")
            .populate("photographer_id");

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const photographer = booking.photographer_id;
        const buyerAddress = [
            booking.flatOrHouseNo,
            booking.streetName,
            booking.city,
            booking.state,
            booking.postalCode ? `${booking.postalCode}` : ""
        ].filter(Boolean).join(", ");

        const invoiceData = {
            invoiceNo: booking.veroaPartnerInvoiceNo || `PIN-${booking._id.toString().slice(-6).toUpperCase()}`,
            date: new Date(booking.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }),
            
            // Header Info for Partner Invoice
            headerAddress: "1st Floor, C-123, Janpath, Lal Kothi, Jaipur",
            headerCityState: "Jaipur, Rajasthan, 302015",
            headerGstin: "08AABCU7755Q1ZG",

            seller: {
                name: photographer?.basicInfo?.fullName || photographer?.name || "Photographer",
                address: photographer?.basicInfo?.address || photographer?.address || "N/A",
                gstin: photographer?.gstin || "",
                state: photographer?.basicInfo?.state || "N/A",
                stateCode: "", 
            },
            
            buyer: {
                name: booking.client_id?.username || booking.client_id?.fullName || "Client",
                address: buyerAddress || "N/A",
                gstin: "N/A",
                state: booking.state || "N/A",
                stateCode: "", 
                placeOfSupply: booking.state || "N/A"
            },
            
            items: [
                {
                    description: `Service Charges - ${booking.service_id?.serviceName || booking.shootType || "Photography Service"}`,
                    sac: "998715", 
                    amount: booking.totalAmount || 0,
                    discount: 0,
                    taxableValue: booking.totalAmount || 0,
                }
            ],
            
            total: booking.totalAmount || 0,
            taxableValueInWords: "",
        };

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Partner-Receipt-${invoiceData.invoiceNo}.pdf`
        );

        await generatePartnerInvoicePDF(invoiceData, res);
        
    } catch (err) {
        console.error("Partner Invoice generation error:", err);
        res.status(500).json({ message: "Partner Invoice generation failed" });
    }
};

export const testUserInvoice = async (req, res) => {
    const sampleData = {
        invoiceNo: "UCIC250004176344",
        date: "23 May, 2025",
        seller: SELLER_INFO,
        buyer: {
            name: "Kanishka Gupta",
            address: "C2 Anita colony Bajaj nagar, Anita Colony, Bajaj Nagar, Jaipur, Rajasthan 302015",
            state: "Rajasthan",
            stateCode: "08",
            placeOfSupply: "Rajasthan 08"
        },
        items: [{
            description: "Convenience and Platform Fee - AC Service and Repair",
            sac: "999799",
            amount: 126.27,
            discount: 0,
            taxableValue: 126.27,
        }],
        igst: { rate: 18, amount: 22.73 },
        total: 149
    };
    res.setHeader("Content-Type", "application/pdf");
    await generateInvoicePDF(sampleData, res);
};

export const testPartnerInvoice = async (req, res) => {
    const sampleData = {
        invoiceNo: "PIN2500003210959",
        date: "23 May, 2025",
        headerAddress: "1st Floor, C-123, Janpath, Lal Kothi, Jaipur",
        headerCityState: "Jaipur, Rajasthan, 302015",
        headerGstin: "08AABCU7755Q1ZG",
        seller: {
            name: "Mohd Asiv",
            address: "Jaipur, Rajasthan",
            gstin: "",
            state: "Rajasthan",
            stateCode: "08", 
        },
        buyer: {
            name: "Kanishka Gupta",
            address: "C2 Anita colony Bajaj nagar, Anita Colony, Bajaj Nagar, Jaipur, Rajasthan 302015",
            state: "Rajasthan",
            stateCode: "08", 
            placeOfSupply: "Rajasthan 08"
        },
        items: [{
            description: "Service Charges - AC Service and Repair",
            sac: "998715", 
            amount: 199,
            discount: 0,
            taxableValue: 199,
        }],
        total: 199,
    };
    res.setHeader("Content-Type", "application/pdf");
    await generatePartnerInvoicePDF(sampleData, res);
};

