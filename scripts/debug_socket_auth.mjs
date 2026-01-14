import { io } from "socket.io-client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 5002;
// Check if URL logic matches app.js
const socketUrl = `http://localhost:${port}`;

const secret = process.env.JWT_SECRET;
if (!secret) {
    console.error("No JWT_SECRET found in .env");
    process.exit(1);
}

const validToken = jwt.sign({ id: "testuser", userType: "client" }, secret);

const testCases = [
    { name: "Raw Token", token: validToken },
    { name: "Bearer Token", token: `Bearer ${validToken}` },
    { name: "Bearer Token (Extra Spaces)", token: `Bearer   ${validToken}  ` },
    { name: "Quoted Token", token: `"${validToken}"` },
    { name: "Quoted Bearer Token", token: `"Bearer ${validToken}"` },
    { name: "Bearer Quoted", token: `Bearer "${validToken}"` }, // Less likely but good to test
];

async function runTests() {
    console.log(`Testing Socket Auth on ${socketUrl}...`);

    for (const test of testCases) {
        await new Promise((resolve) => {
            const socket = io(socketUrl, {
                auth: { token: test.token },
                transports: ["websocket"],
                forceNew: true, // Ensure new connection each time
                reconnection: false
            });

            let timer = setTimeout(() => {
                console.log(`❌ ${test.name}: Timeout (Connection not established)`);
                socket.close();
                resolve();
            }, 2000);

            socket.on("connect", () => {
                clearTimeout(timer);
                console.log(`✅ ${test.name}: Connected!`);
                socket.close();
                resolve();
            });

            socket.on("connect_error", (err) => {
                clearTimeout(timer);
                console.log(`❌ ${test.name}: Error - ${err.message}`);
                // Don't close immediately here, it might retry, but we set reconnection: false
                socket.close();
                resolve();
            });
        });
    }
}

runTests();
