import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import ServiceBooking from "../../models/ServiceBookings.mjs";
const ADMIN = {
    name: "VEROA STUDIOS",
    address: "New Delhi, India",
    phone: "+91-XXXXXXXXXX",
    email: "support@yourbrand.com",
};

export const downloadInvoice = async (req, res) => {
    try {
        const booking = await ServiceBooking.findById(req.params.bookingId)
            .populate("client_id")
            .populate("service_id");

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Invoice-${booking.veroaBookingId}.pdf`
        );

        doc.pipe(res);

        /* ========= LOGO ========= */
        const logoPath = path.join(process.cwd(), "assests/Logo/logo.png");
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 40, { width: 80 });
        }

        /* ========= TITLE ========= */
        doc
            .fontSize(20)
            .text("TAX INVOICE", 0, 50, { align: "right" });

        /* ========= ADMIN INFO ========= */
        doc
            .fontSize(10)
            .text("VEROA STUDIOS", 50, 130)
            .text("New Delhi, India")
            .text("Phone: +91-XXXXXXXXXX")
            .text("Email: [EMAIL_ADDRESS]");

        /* ========= INVOICE META ========= */
        doc
            .text(`Booking ID: ${booking.veroaBookingId}`, 50, 200)
            .text(`Invoice Date: ${new Date().toLocaleDateString("en-IN")}`)
            .text(`Payment Mode: ${booking.paymentMode}`)
            .text(`Payment Status: ${booking.paymentStatus}`);

        /* ========= BILL TO ========= */
        doc
            .moveDown(2)
            .fontSize(12)
            .text("Bill To", { underline: true });

        doc
            .fontSize(10)
            .text(booking.client_id?.username || "Client")
            .text(
                `${booking.flatOrHouseNo}, ${booking.streetName}, ${booking.city}`
            )
            .text(`${booking.state} - ${booking.postalCode}`);

        /* ========= TABLE HEADER ========= */
        const tableTop = doc.y + 30;

        doc
            .fontSize(10)
            .text("Description", 50, tableTop)
            .text("Qty", 300, tableTop)
            .text("Rate (₹)", 360, tableTop, { width: 90, align: "right" })
            .text("Amount (₹)", 460, tableTop, { width: 90, align: "right" });

        doc
            .moveTo(50, tableTop + 15)
            .lineTo(550, tableTop + 15)
            .stroke();

        /* ========= TABLE ROW ========= */
        const amount = booking.totalAmount || 0;
        const rowY = tableTop + 30;

        doc
            .text(
                booking.service_id?.name || "Photography Service",
                50,
                rowY
            )
            .text("1", 300, rowY)
            .text(amount.toFixed(2), 360, rowY, {
                width: 90,
                align: "right",
            })
            .text(amount.toFixed(2), 460, rowY, {
                width: 90,
                align: "right",
            });

        /* ========= TOTALS ========= */
        const totalsY = rowY + 80;

        doc
            .fontSize(10)
            .text(`Subtotal: ₹ ${amount.toFixed(2)}`, 350, totalsY, {
                align: "right",
            })
            .text(
                `Outstanding: ₹ ${booking.outStandingAmount.toFixed(2)}`,
                350,
                totalsY + 15,
                { align: "right" }
            );

        doc
            .fontSize(12)
            .text(
                `Total Amount: ₹ ${amount.toFixed(2)}`,
                350,
                totalsY + 40,
                {
                    align: "right",
                    underline: true,
                }
            );

        /* ========= FOOTER ========= */
        doc
            .fontSize(9)
            .text(
                "This is a system generated invoice. All transactions are in INR.",
                50,
                750,
                { align: "center" }
            );

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Invoice generation failed" });
    }
};
