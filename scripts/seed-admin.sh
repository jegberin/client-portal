#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-info@crettyard.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-eb9n2V2%ZKAX}"
ADMIN_NAME="${ADMIN_NAME:-Crettyard Digital}"
ORG_NAME="${ORG_NAME:-Crettyard Digital}"

echo "Creating admin account: ${ADMIN_EMAIL} with org: ${ORG_NAME}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/onboarding/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${ADMIN_NAME}\",\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"orgName\":\"${ORG_NAME}\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "Admin account created successfully."
elif echo "$BODY" | grep -qi "already exists\|duplicate"; then
  echo "Admin account already exists — skipping."
else
  echo "Failed to create admin account (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi
