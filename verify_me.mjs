
const BASE_URL = "http://localhost:5002/api";
const MOBILE_NUMBER = "9999999999";
const ROLE = "user";
const OTP = "1234";

async function runVerification() {
    try {
        console.log("1. Logging in...");
        // 1. Send OTP
        const sendOtpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mobileNumber: MOBILE_NUMBER, role: ROLE }),
        });
        const sendOtpData = await sendOtpRes.json();
        console.log("   Send OTP response:", sendOtpData);

        // 2. Verify OTP to get token
        const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mobileNumber: MOBILE_NUMBER, role: ROLE, otp: OTP }),
        });
        const verifyData = await verifyRes.json();

        if (!verifyData.token) {
            throw new Error("Failed to get token: " + JSON.stringify(verifyData));
        }
        const token = verifyData.token;
        console.log("   Login successful. Token received.");

        console.log("\n2. Testing /me endpoint with token...");
        const meRes = await fetch(`${BASE_URL}/users/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        const meData = await meRes.json();
        console.log("   Response:", meData);

        if (meData.success) {
            console.log("✅ verification PASSED: /me endpoint returned success.");
        } else {
            console.error("❌ verification FAILED: /me endpoint returned failure.");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

runVerification();
