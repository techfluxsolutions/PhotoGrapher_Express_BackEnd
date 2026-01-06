#!/bin/bash
MOBILE="9999999999"
ROLE="user"

echo "1. Sending OTP to create user..."
curl -s -X POST http://localhost:5002/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"mobileNumber\": \"$MOBILE\", \"role\": \"$ROLE\"}" | jq
  
echo -e "\n\n2. Sending OTP again for existing user..."
curl -s -X POST http://localhost:5002/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"mobileNumber\": \"$MOBILE\", \"role\": \"$ROLE\"}" | jq
