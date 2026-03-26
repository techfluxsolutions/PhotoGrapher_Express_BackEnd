import axios from "axios";

export const sendMessageCentral = async (mobileNumber) => {
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

    const url = `${baseUrl}/v2/sms/send`;
    const data = {
        customerId,
        destination: [`91${mobileNumber}`],
        message,
        reportUrl: ""
    };

    return await axios.post(url, data, {
        headers: {
            AuthToken: authToken,
            "Content-Type": "application/json",
        },
    });
};
