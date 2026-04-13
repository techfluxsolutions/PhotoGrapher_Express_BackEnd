import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



/**
 * Convert number to words (Simple Indian numbering system version)
 * @param {number} num 
 */
function numberToWords(num) {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

    if (num === 0) return 'zero';
    if (num < 0) return 'minus ' + numberToWords(Math.abs(num));

    let words = '';

    if (Math.floor(num / 100000) > 0) {
        words += numberToWords(Math.floor(num / 100000)) + ' lakh ';
        num %= 100000;
    }

    if (Math.floor(num / 1000) > 0) {
        words += numberToWords(Math.floor(num / 1000)) + ' thousand ';
        num %= 1000;
    }

    if (Math.floor(num / 100) > 0) {
        words += numberToWords(Math.floor(num / 100)) + ' hundred ';
        num %= 100;
    }

    if (num > 0) {
        if (words !== '') words += 'and ';
        if (num < 10) words += ones[num];
        else if (num < 20) words += teens[num - 10];
        else {
            words += tens[Math.floor(num / 10)];
            if (num % 10 > 0) words += ' ' + ones[num % 10];
        }
    }

    return words.trim();
}

/**
 * Format decimal amount in words
 * @param {number} amount 
 */
function amountToWords(amount) {
    const wholePart = Math.floor(amount);
    const decimalPart = Math.round((amount - wholePart) * 100);

    let result = numberToWords(wholePart) + " only";
    if (decimalPart > 0) {
        result = numberToWords(wholePart) + " point " + numberToWords(decimalPart) + " only";
    }
    return result;
}

/**
 * Generate Tax Invoice PDF in Urban Company Style
 * @param {Object} invoice
 * @param {Stream} stream - The writable stream to pipe the PDF to (e.g., res or fs.createWriteStream)
 */
export const generateInvoicePDF = async (invoice, stream) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    doc.pipe(stream);

    const LEFT_COL_X = 40;
    const RIGHT_COL_X = 350;
    const PAGE_WIDTH = 550;

    /* ---------------- HEADER ---------------- */
    // Logo
    const logoPath = path.join(__dirname, "../../assests/Logo/logo.png");

    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 5, 15, { width: 100 });
        // Brand Name (Main)
        doc
            .font("Helvetica-Bold")
            .fontSize(20)
            .fillColor("#111111")
            .text("VEROA", LEFT_COL_X + 40, 40);

        // Tagline / Sub Brand
        doc
            .font("Helvetica")
            .fontSize(12)
            .fillColor("#666666")
            .text("Photography Studio", LEFT_COL_X + 40, 62);

        // Optional: Add a divider line
        doc
            .moveTo(LEFT_COL_X + 40, 80)
            .lineTo(LEFT_COL_X + 200, 80)
            .lineWidth(1)
    } else {
        doc.fontSize(18).font("Helvetica-Bold").text("UC ", LEFT_COL_X, 40, { continued: true })
            .fontSize(14).text("Urban Company", { continued: false });
    }

    doc.fontSize(16).font("Helvetica-Bold").text("TAX INVOICE", RIGHT_COL_X + 50, 40, { align: "right" });

    doc.moveDown(0.5);

    // Company Information (Left Side under Logo)
    doc.fontSize(8).font("Helvetica")
        .text(invoice.seller.fullName || "Urban Company Limited (Formerly known as Urbanclap Technologies India Limited)", LEFT_COL_X, 90, { width: 250 })
        .text("Registered Office")
        .text(invoice.seller.address, { width: 250 })
        .text(`Email: ${invoice.seller.email}`)
        .text(`Telephone: ${invoice.seller.phone}`)
        .text(`CIN ${invoice.seller.cin}`)
        .text(invoice.seller.website)
        .moveDown(2);

    const currentY = doc.y + 30;

    /* ---------------- DETAILS COLUMNS ---------------- */

    // Left Column
    doc.fontSize(9).font("Helvetica-Bold").text("Customer Name", LEFT_COL_X, currentY);
    doc.font("Helvetica").text(invoice.buyer.name);
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).lineWidth(0.5).strokeColor("#cccccc").stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Invoice no.");
    doc.font("Helvetica").text(invoice.invoiceNo);
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Delivery Address");
    doc.font("Helvetica").text(invoice.buyer.address, { width: 280 });
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Invoice Date");
    doc.font("Helvetica").text(invoice.date);
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("State Name & Code");
    doc.font("Helvetica").text(`${invoice.buyer.state} ${invoice.buyer.stateCode || ""}`);
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Place of Supply");
    doc.font("Helvetica").text(`${invoice.buyer.placeOfSupply || invoice.buyer.state}`);
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).stroke();

    // Right Column
    doc.fontSize(9).font("Helvetica-Bold").text("DELIVERY SERVICE PROVIDER", RIGHT_COL_X, currentY);
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold").text("Business GSTIN");
    doc.font("Helvetica").text(invoice.seller.gstin);
    doc.moveTo(RIGHT_COL_X, doc.y + 2).lineTo(PAGE_WIDTH, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Business Name");
    doc.font("Helvetica").text(invoice.seller.name, { width: 200 });
    doc.moveTo(RIGHT_COL_X, doc.y + 2).lineTo(PAGE_WIDTH, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Address");
    doc.font("Helvetica").text(invoice.seller.serviceProviderAddress || invoice.seller.address, { width: 200 });
    doc.moveTo(RIGHT_COL_X, doc.y + 2).lineTo(PAGE_WIDTH, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("State Name & Code");
    doc.font("Helvetica").text(`${invoice.seller.state || ""} ${invoice.seller.stateCode || ""}`);
    doc.moveTo(RIGHT_COL_X, doc.y + 2).lineTo(PAGE_WIDTH, doc.y + 2).stroke();

    doc.moveDown(3);

    /* ---------------- ITEMS TABLE HEADER ---------------- */
    const tableTop = doc.y;
    doc.rect(LEFT_COL_X, tableTop+20, PAGE_WIDTH - LEFT_COL_X, 20).fill("#f7f7f7");
    doc.fillColor("black").font("Helvetica-Bold").fontSize(10);
    doc.text("Items", LEFT_COL_X + 5, tableTop + 28);
    doc.text("Convenience Fees", PAGE_WIDTH - 100, tableTop + 28, { align: "right" });

    let yPos = tableTop + 50;

    /* ---------------- ITEMS ---------------- */
    invoice.items.forEach(item => {
        doc.font("Helvetica-Bold").fontSize(10).text(item.description, LEFT_COL_X + 5, yPos);
        doc.font("Helvetica").fontSize(8).text(`SAC: ${item.sac || "N/A"}`, LEFT_COL_X + 5, doc.y);

        const valueX = PAGE_WIDTH - 150;
        const amountX = PAGE_WIDTH - 10;

        doc.fontSize(9).text("Gross Amount", valueX, yPos, { align: "left" });
        doc.text(`Rs. ${item.amount.toFixed(2)}`, amountX - 40, yPos, { align: "right" });
        yPos += 40;

        doc.text("Discount", valueX, yPos);
        doc.text(`- Rs. ${(item.discount || 0).toFixed(2)}`, amountX - 40, yPos, { align: "right" });
        yPos += 40;

        doc.text("Convenience Fees", valueX, yPos);
        doc.text(`Rs. ${item.taxableValue.toFixed(2)}`, amountX - 40, yPos, { align: "right" });
        doc.font("Helvetica").fontSize(7).text(`(${invoice.taxableValueInWords || amountToWords(item.taxableValue)})`, valueX, doc.y + 2, { width: 150 });
        yPos += 40;

        if (invoice.igst) {
            doc.fontSize(9).text(`IGST @${invoice.igst.rate}%`, valueX, yPos);
            doc.text(`Rs. ${invoice.igst.amount.toFixed(2)}`, amountX - 40, yPos, { align: "right" });
            doc.font("Helvetica").fontSize(7).text(`(${invoice.igstValueInWords || amountToWords(invoice.igst.amount)})`, valueX, doc.y + 2, { width: 150 });
            yPos += 40;
        }

        if (invoice.cgst) {
            doc.fontSize(9).text(`CGST @${invoice.cgst.rate}%`, valueX, yPos);
            doc.text(`Rs. ${invoice.cgst.amount.toFixed(2)}`, amountX - 40, yPos, { align: "right" });
            yPos += 15;
            doc.fontSize(9).text(`SGST @${invoice.sgst.rate}%`, valueX, yPos);
            doc.text(`Rs. ${invoice.sgst.amount.toFixed(2)}`, amountX - 40, yPos, { align: "right" });
            yPos += 40;
        }
    });

    /* ---------------- TOTAL SECTION ---------------- */
    doc.rect(LEFT_COL_X, yPos, PAGE_WIDTH - LEFT_COL_X, 20).fill("#f7f7f7");
    doc.fillColor("black").font("Helvetica-Bold").fontSize(10);
    doc.text("TOTAL AMOUNT", LEFT_COL_X + 5, yPos + 5);
    doc.text(`Rs. ${invoice.total.toFixed(0)}`, PAGE_WIDTH - 100, yPos + 5, { align: "right" });

    yPos += 60;

    /* ---------------- FOOTER ---------------- */
    doc.fontSize(8).font("Helvetica").text("*Reverse Charge mechanism not applicable", LEFT_COL_X, yPos + 120);

    const signaturePath = path.join(__dirname, "../../assests/signature/Adobe_page-0001.jpg");
    let signatureY = yPos + 10;

    if (fs.existsSync(signaturePath)) {
        doc.image(signaturePath, PAGE_WIDTH - 150, signatureY + 28, { width: 120 });
        signatureY += 110;
    } else if (invoice.signatureImage && fs.existsSync(invoice.signatureImage)) {
        doc.image(invoice.signatureImage, PAGE_WIDTH - 150, signatureY, { width: 120 });
        signatureY += 110;
    }

    doc.fontSize(9).font("Helvetica-Bold").text("Signature of supplier/authorized representative", PAGE_WIDTH - 250, signatureY, { align: "right" });

    doc.moveDown(6); // Final bottom margin

    doc.end();

    return new Promise((resolve) => {
        stream.on("finish", resolve);
    });
};


// Function calling with demo data matching the new format
/*
await generateInvoicePDF(
    {
        invoiceNo: "UCIC250004176344",
        date: "23 May, 2025",

        seller: {
            name: "Urban Company Limited (Formerly known as Urbanclap Technologies India Limited and Urbanclap Technologies India Private Limited)",
            fullName: "Urban Company Limited (Formerly known as Urbanclap Technologies India Limited and Urbanclap Technologies India Private Limited)",
            address: "Unit No. 08, Ground Floor, Rectangle 1, D4, Saket District Centre, New Delhi, Delhi, India - 110017",
            serviceProviderAddress: "7TH and 8TH Floor, Plot No 183, Udyog Vihar, Sector 20, Rajiv Nagar, Gurugram, Haryana - 122016",
            gstin: "06AABCU7755Q1ZK",
            phone: "+911244570250",
            email: "help@urbancompany.com",
            cin: "U74140DL2014PLC274413",
            website: "www.urbancompany.com",
            state: "Haryana",
            stateCode: "06"
        },

        buyer: {
            name: "Kanishka Gupta",
            address: "C2 Anita colony Bajaj nagar, Anita Colony, Bajaj Nagar, Jaipur, Rajasthan 302015, India, Bajaj nagar post office",
            gstin: "N/A",
            state: "Rajasthan",
            stateCode: "08",
            placeOfSupply: "Rajasthan 08"
        },

        items: [
            {
                description: "Convenience and Platform Fee - AC Service and Repair",
                sac: "999799",
                amount: 126.27,
                discount: 0,
                taxableValue: 126.27,
            },
        ],

        igst: {
            rate: 18,
            amount: 22.73
        },
        
        total: 149,
        taxableValueInWords: "one hundred and twenty six point two seven only",
        igstValueInWords: "twenty two point seven three only",
        
        // signatureImage: path.join(process.cwd(), "signature.png")
    },
    path.join(process.cwd(), "invoice.pdf")
);
*/

/**
 * Generate Partner (Photographer) Invoice PDF in Urban Company Style
 * @param {Object} invoice
 * @param {Stream} stream - The writable stream to pipe the PDF to
 */
export const generatePartnerInvoicePDF = async (invoice, stream) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    doc.pipe(stream);

    const LEFT_COL_X = 40;
    const RIGHT_COL_X = 350;
    const PAGE_WIDTH = 550;

    /* ---------------- HEADER ---------------- */
    // Logo
    const logoPath = path.join(__dirname, "../../assests/Logo/logo.png");
    
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 5, 15, { width: 100 });
        // Brand Name (Main)
        doc
            .font("Helvetica-Bold")
            .fontSize(20)
            .fillColor("#111111")
            .text("VEROA", LEFT_COL_X + 40, 40);

        // Tagline / Sub Brand
        doc
            .font("Helvetica")
            .fontSize(12)
            .fillColor("#666666")
            .text("Photography Studio", LEFT_COL_X + 40, 62);

        // Optional: Add a divider line
        doc
            .moveTo(LEFT_COL_X + 40, 80)
            .lineTo(LEFT_COL_X + 200, 80)
            .lineWidth(1)
    } else {
        doc.fontSize(18).font("Helvetica-Bold").text("UC ", LEFT_COL_X, 40, { continued: true })
            .fontSize(14).text("Urban Company", { continued: false });
    }

    doc.fontSize(11).font("Helvetica-Bold").text("TAX INVOICE/RECEIPT (UC PARTNER RECEIPT)", RIGHT_COL_X - 10, 40, { align: "right" });

    doc.moveDown(0.5);

    // Address under logo
    doc.fontSize(8).font("Helvetica")
        .text(invoice.headerAddress || "1st Floor, C-123, Janpath, Lal Kothi, Jaipur", LEFT_COL_X, 100, { width: 250 })
        .text(invoice.headerCityState || "Jaipur, Rajasthan, 302015")
        .text(`GSTIN: ${invoice.headerGstin || "08AABCU7755Q1ZG"}`)
        .moveDown(2);

    const currentY = doc.y;

    /* ---------------- DETAILS COLUMNS ---------------- */

    // Left Column
    doc.fontSize(9).font("Helvetica-Bold").text("Customer Name", LEFT_COL_X , currentY+20);
    doc.font("Helvetica").text(invoice.buyer.name);
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).lineWidth(0.5).strokeColor("#cccccc").stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Invoice no.");
    doc.font("Helvetica").text(invoice.invoiceNo);
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Delivery Address");
    doc.font("Helvetica").text(invoice.buyer.address, { width: 280 });
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Invoice Date");
    doc.font("Helvetica").text(invoice.date);
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("State Name & Code");
    doc.font("Helvetica").text(`${invoice.buyer.state} ${invoice.buyer.stateCode || ""}`);
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Place of Supply");
    doc.font("Helvetica").text(`${invoice.buyer.placeOfSupply || invoice.buyer.state}`);
    doc.moveTo(LEFT_COL_X, doc.y + 2).lineTo(320, doc.y + 2).stroke();

    // Right Column
    doc.fontSize(9).font("Helvetica-Bold").text("DELIVERY SERVICE PROVIDER", RIGHT_COL_X, currentY+20);
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold").text("Business GSTIN");
    doc.font("Helvetica").text(invoice.seller.gstin || "");
    doc.moveTo(RIGHT_COL_X, doc.y + 2).lineTo(PAGE_WIDTH, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Business Name");
    doc.font("Helvetica").text(invoice.seller.name, { width: 200 });
    doc.moveTo(RIGHT_COL_X, doc.y + 2).lineTo(PAGE_WIDTH, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("Address");
    doc.font("Helvetica").text(invoice.seller.address || "", { width: 200 });
    doc.moveTo(RIGHT_COL_X, doc.y + 2).lineTo(PAGE_WIDTH, doc.y + 2).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("State Name & Code");
    doc.font("Helvetica").text(`${invoice.seller.state || ""} ${invoice.seller.stateCode || ""}`);
    doc.moveTo(RIGHT_COL_X, doc.y + 2).lineTo(PAGE_WIDTH, doc.y + 2).stroke();

    doc.moveDown(3);

    /* ---------------- ITEMS TABLE HEADER ---------------- */
    const tableTop = doc.y;
    doc.rect(LEFT_COL_X, tableTop+60, PAGE_WIDTH - LEFT_COL_X, 20).fill("#f7f7f7");
    doc.fillColor("black").font("Helvetica-Bold").fontSize(10);
    doc.text("Items", LEFT_COL_X + 5, tableTop + 65);
    doc.text("Convenience Fees", PAGE_WIDTH - 100, tableTop + 65, { align: "right" });

    let yPos = tableTop + 85;

    /* ---------------- ITEMS ---------------- */
    invoice.items.forEach(item => {
        doc.font("Helvetica-Bold").fontSize(10).text(item.description, LEFT_COL_X + 5, yPos);
        doc.font("Helvetica").fontSize(8).text(`SAC: ${item.sac || "N/A"}`, LEFT_COL_X + 5, doc.y);

        const valueX = PAGE_WIDTH - 150;
        const amountX = PAGE_WIDTH - 10;

        doc.fontSize(9).text("Gross Amount", valueX, yPos, { align: "left" });
        doc.text(`Rs. ${item.amount.toFixed(2)}`, amountX - 40, yPos, { align: "right" });
        yPos += 40;

        doc.text("Discount", valueX, yPos);
        doc.text(`- Rs. ${(item.discount || 0).toFixed(2)}`, amountX - 40, yPos, { align: "right" });
        yPos += 40;

        doc.text("Convenience Fees", valueX, yPos);
        doc.text(`Rs. ${item.taxableValue.toFixed(2)}`, amountX - 40, yPos, { align: "right" });
        doc.font("Helvetica").fontSize(7).text(`(${invoice.taxableValueInWords || amountToWords(item.taxableValue)})`, valueX, doc.y + 2, { width: 150 });
        yPos += 40;
    });

    /* ---------------- TOTAL SECTION ---------------- */
    doc.rect(LEFT_COL_X, yPos, PAGE_WIDTH - LEFT_COL_X, 20).fill("#f7f7f7");
    doc.fillColor("black").font("Helvetica-Bold").fontSize(10);
    doc.text("TOTAL AMOUNT", LEFT_COL_X + 5, yPos + 5);
    doc.text(`Rs. ${invoice.total.toFixed(0)}`, PAGE_WIDTH - 100, yPos + 5, { align: "right" });

    yPos += 100;



    doc.moveDown(6); // Final bottom margin
    doc.end();

    return new Promise((resolve) => {
        stream.on("finish", resolve);
    });
};
