#!/bin/bash
BASE_URL="http://localhost:5002/api"
MOBILE="9999999999"
ROLE="user"
OTP="1234"

echo "1. Sending OTP..."
curl -s -X POST "$BASE_URL/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"mobileNumber\": \"$MOBILE\", \"role\": \"$ROLE\"}" 

echo -e "\n\n2. Verifying OTP..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"mobileNumber\": \"$MOBILE\", \"role\": \"$ROLE\", \"otp\": \"$OTP\"}")

echo "Response: $RESPONSE"

TOKEN=$(echo $RESPONSE | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "\n❌ Failed to get token"
  exit 1
fi

echo -e "\n✅ Token received: $TOKEN"

echo -e "\n3. Testing /me endpoint..."
curl -v "$BASE_URL/users/me" \
  -H "Authorization: Bearer $TOKEN"
