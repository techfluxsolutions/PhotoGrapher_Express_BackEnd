import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * Generate Tax Invoice PDF
 * @param {Object} invoice
 * @param {string} outputPath
 */
export const generateInvoicePDF = async (invoice, outputPath) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    /* ---------------- HEADER ---------------- */
    doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("TAX INVOICE", { align: "center" })
        .moveDown(1);

    doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(invoice.seller.name)
        .font("Helvetica")
        .text(invoice.seller.address)
        .text(`GSTIN: ${invoice.seller.gstin}`)
        .text(`Contact: ${invoice.seller.phone}`)
        .moveDown(0.5);

    doc
        .font("Helvetica-Bold")
        .text(`Invoice No: ${invoice.invoiceNo}`, { continued: true })
        .font("Helvetica")
        .text(`        Date: ${invoice.date}`)
        .moveDown(1);

    /* ---------------- BUYER ---------------- */
    doc
        .font("Helvetica-Bold")
        .text("Bill To:")
        .font("Helvetica")
        .text(invoice.buyer.name)
        .text(invoice.buyer.address)
        .text(`GSTIN: ${invoice.buyer.gstin}`)
        .text(`State: ${invoice.buyer.state}`)
        .moveDown(1);

    /* ---------------- TABLE HEADER ---------------- */
    const tableTop = doc.y;
    const col = {
        sn: 40,
        desc: 70,
        hsn: 260,
        qty: 320,
        rate: 380,
        amount: 460,
    };

    doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("SI", col.sn, tableTop)
        .text("Description", col.desc, tableTop)
        .text("HSN", col.hsn, tableTop)
        .text("Qty", col.qty, tableTop)
        .text("Rate", col.rate, tableTop)
        .text("Amount", col.amount, tableTop);

    doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    /* ---------------- TABLE ROWS ---------------- */
    let y = tableTop + 25;

    invoice.items.forEach((item, index) => {
        doc
            .font("Helvetica")
            .fontSize(9)
            .text(index + 1, col.sn, y)
            .text(item.description, col.desc, y)
            .text(item.hsn, col.hsn, y)
            .text(item.quantity, col.qty, y)
            .text(item.rate.toFixed(2), col.rate, y)
            .text(item.amount.toFixed(2), col.amount, y);

        y += 20;
    });

    /* ---------------- TOTALS ---------------- */
    doc.moveDown(2);

    doc
        .font("Helvetica")
        .text(`Freight Charges: ₹ ${invoice.freight.toFixed(2)}`, { align: "right" })
        .text(`CGST: ₹ ${invoice.cgst.toFixed(2)}`, { align: "right" })
        .text(`SGST: ₹ ${invoice.sgst.toFixed(2)}`, { align: "right" })
        .font("Helvetica-Bold")
        .text(`Grand Total: ₹ ${invoice.total.toFixed(2)}`, { align: "right" })
        .moveDown(1);

    /* ---------------- AMOUNT IN WORDS ---------------- */
    doc
        .font("Helvetica")
        .text(`Amount Chargeable (in words):`)
        .font("Helvetica-Bold")
        .text(invoice.amountInWords)
        .moveDown(1);

    /* ---------------- BANK DETAILS ---------------- */
    doc
        .font("Helvetica-Bold")
        .text("Company Bank Details")
        .font("Helvetica")
        .text(`Account Name: ${invoice.bank.accountName}`)
        .text(`Bank: ${invoice.bank.bankName}`)
        .text(`A/C No: ${invoice.bank.accountNumber}`)
        .text(`IFSC: ${invoice.bank.ifsc}`)
        .moveDown(2);

    /* ---------------- FOOTER ---------------- */
    doc
        .fontSize(8)
        .text("This is a Computer Generated Invoice", { align: "center" });

    doc.end();

    return new Promise((resolve) => {
        stream.on("finish", resolve);
    });
};


//function calling 
await generateInvoicePDF(
    {
        invoiceNo: "INV-1023",
        date: "15-Jul-2024",

        seller: {
            name: "R.B.T. TEXTILES",
            address: "Upper Ground Floor, WZ-27, Vishnu Garden, Delhi - 110018",
            gstin: "07AAGPJ6614H1ZS",
            phone: "+91-9313563580",
        },

        buyer: {
            name: "ARPIT FASHIONS PRIVATE LIMITED",
            address: "B-28, Lawrence Road, Industrial Area, Delhi - 110035",
            gstin: "07AAKCA6484B1ZO",
            state: "Delhi",
        },

        items: [
            {
                description: "FABRICS",
                hsn: "52114200",
                quantity: 1754,
                rate: 204.73,
                amount: 359096.42,
            },
        ],

        freight: 1200,
        cgst: 9007.41,
        sgst: 9007.41,
        total: 378310,
        amountInWords:
            "INR Three Lakh Seventy Eight Thousand Three Hundred Ten Only",

        bank: {
            accountName: "R.B.T. TEXTILES",
            bankName: "IDFC Bank Ltd",
            accountNumber: "10075573210",
            ifsc: "IDFB0020143",
        },
    },
    path.join(process.cwd(), "invoice.pdf")
);
