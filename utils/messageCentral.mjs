import axios from "axios";

export const sendMessageCentral = async (mobileNumber, codeLength = 4) => {
    const baseUrl = process.env.MESSAGE_CENTRAL_BASE_URL;
    const authToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN;
    const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID;

    if (!baseUrl || !authToken || !customerId) {
        throw new Error("SMS service not configured");
    }

    const params = new URLSearchParams({
        customerId,
        countryCode: "91",
        flowType: "SMS",
        mobileNumber,
        timeout: "60",
        messageId: "1", // Optional: system requirement for some flows
        codeLength: codeLength.toString() // Support 4 or 6 digits
    });

    const url = `${baseUrl}/verification/v3/send?${params.toString()}`;

    return await axios.post(url, null, {
        headers: {
            AuthToken: authToken,
            "Content-Type": "application/json",
        },
    });
};

export const verifyMessageCentral = async (verificationId, code) => {
    const baseUrl = process.env.MESSAGE_CENTRAL_BASE_URL;
    const authToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN;
    const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID;

    if (!baseUrl || !authToken || !customerId) {
        throw new Error("SMS service not configured");
    }

    const verifyUrl = `${baseUrl}/verification/v3/validateOtp?customerId=${customerId}&verificationId=${verificationId}&code=${code}`;

    return await axios.get(verifyUrl, {
        headers: { authToken },
        timeout: 10000,
    });
};

export const sendBookingSMS = async (mobileNumber, message) => {
    const baseUrl = process.env.MESSAGE_CENTRAL_BASE_URL;
    const authToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN;
    const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID;

    if (!baseUrl || !authToken || !customerId) {
        throw new Error("SMS service not configured");
    }

    // Sanitize mobile number
    let cleaned = mobileNumber.toString().replace(/\D/g, "");
    if (cleaned.length > 10 && cleaned.startsWith("91")) {
        cleaned = cleaned.slice(-10);
    }

    // Some MessageCentral accounts use a different base domain for custom SMS vs. verification
    const customSmsBaseUrl = "https://api.messagecentral.com";
    const endpoints = [`${customSmsBaseUrl}/v2/sms/send`, `${baseUrl}/v2/sms/send`, `${baseUrl}/v3/sms/send` ];
    let lastError = null;

    for (const url of endpoints) {
        console.log(`[SMS DEBUG] Attempting Custom SMS: ${url}`);
        
        try {
            const data = {
                customerId,
                phoneNumbers: [`91${cleaned}`],
                MobileNumber: `91${cleaned}`, // Fallback field
                message: message,
            };

            const response = await axios.post(url, data, {
                headers: { AuthToken: authToken, "Content-Type": "application/json" },
                timeout: 8000
            });
            console.log(`[SMS SUCCESS] delivered via ${url}:`, response.data);
            return response;
        } catch (err) {
            lastError = err.response?.data || err.message;
            console.error(`[SMS RETRY] failed for ${url}:`, lastError);
            continue; // try next endpoint
        }
    }

    throw new Error(`All SMS endpoints failed. Last error: ${JSON.stringify(lastError)}`);
};

export const retryMessageCentral = async (verificationId) => {
    const baseUrl = process.env.MESSAGE_CENTRAL_BASE_URL;
    const authToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN;

    if (!baseUrl || !authToken) {
        throw new Error("SMS service not configured");
    }

    const endpoints = [
        `${baseUrl}/verification/v3/retry`,
        `${baseUrl}/verification/v3/resend`
    ];

    let lastError = null;
    for (const urlBase of endpoints) {
        try {
            // Include authKey as a param since 401 suggests the header alone isn't enough for retry
            const url = `${urlBase}?authKey=${authToken}`; 

            console.log(`[SMS RETRY DEBUG] Attempting re-delivery via: ${urlBase}`);
            const response = await axios.post(url, { verificationId }, {
                headers: { AuthToken: authToken, "Content-Type": "application/json" },
                timeout: 8000
            });
            return response;
        } catch (err) {
            lastError = err.response?.data || err.message;
            console.error(`[SMS RETRY FAILED] at ${urlBase}:`, lastError);
        }
    }

    throw new Error(`Re-delivery failed on all channels. Last error: ${JSON.stringify(lastError)}`);
};
