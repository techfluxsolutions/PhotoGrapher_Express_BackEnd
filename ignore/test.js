const uploadFileNode = async () => {
    console.log("=== Node.js Multipart Upload Test ===");

    const CHUNK_SIZE = 5 * 1024 * 1024; // S3 minimum is 5MB for a part
    // Create a 5.1 MB dummy buffer so S3 accepts it as multipart.
    const fileBuffer = Buffer.alloc(5.1 * 1024 * 1024, 'A');

    // Using Admin Routes for the test
    const BASE_URL = "http://localhost:5002/api/admins";
    // For Photographer routes, you would use: "http://localhost:5002/api/photographers/uploads" and their specific endpoints

    console.log("\n1. Requesting to start upload...");
    const startRes = await fetch(`${BASE_URL}/startUploading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fileName: "test-nodejs-upload.txt",
            fileType: "text/plain"
        })
    });

    const startData = await startRes.json();
    console.log("Start API Response:", startData);

    if (!startData.uploadId) {
        throw new Error("Upload start failed!");
    }

    const { uploadId, key } = startData;
    const parts = [];
    const totalParts = Math.ceil(fileBuffer.length / CHUNK_SIZE);

    for (let i = 0; i < totalParts; i++) {
        console.log(`\n2. Requesting Presigned URL for Part ${i + 1}/${totalParts}...`);
        const urlRes = await fetch(`${BASE_URL}/getUploadPartUrl`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                key,
                uploadId,
                partNumber: i + 1
            })
        });

        const { url } = await urlRes.json();
        if (!url) throw new Error(`Failed to get URL for part ${i + 1}`);
        console.log(`Got Presigned URL for Part ${i + 1}`);

        console.log(`3. Uploading Part ${i + 1} to AWS...`);
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileBuffer.length);
        // fetch needs a Buffer or Uint8Array. Buffer works fine in Node.js >= 18 for fetch bodies.
        const chunk = fileBuffer.subarray(start, end);

        const uploadRes = await fetch(url, {
            method: "PUT",
            body: chunk
        });

        const etag = uploadRes.headers.get("etag") || uploadRes.headers.get("ETag");
        if (!uploadRes.ok) {
            throw new Error(`AWS S3 Upload Failed: ${uploadRes.status} ${uploadRes.statusText}`);
        }

        console.log(`Part ${i + 1} successfully uploaded! ETag: ${etag}`);

        parts.push({
            ETag: etag,
            PartNumber: i + 1
        });
    }

    console.log("\n4. Completing upload on backend API...");
    const completeRes = await fetch(`${BASE_URL}/completeUploading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            key,
            uploadId,
            parts,
            bookingid: "test-booking-123",
            // Need valid mongoose ObjectIds since DataLinks schema defines them as ObjectId
            clientId: "6452f1e6b3c2a123456789ab",
            photographerId: "6452f1e6b3c2a123456789ac",
            veroaBookingId: "test-veroa-123"
        })
    });

    const completeData = await completeRes.json();
    console.log("Complete API Response:", completeData);
};

uploadFileNode().catch(console.error);