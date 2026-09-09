#!/usr/bin/env bash
# ==============================================================================
# Deploy AnNien Backend Proxy Gateway to Google Cloud Run (asia-southeast1)
# ==============================================================================

set -euo pipefail

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-annien-care}"
REGION="${GCP_LOCATION:-asia-southeast1}"
SERVICE_NAME="annien-backend-gateway"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "=== Deploying AnNien Gateway to Google Cloud Run ==="
echo "Project:  ${PROJECT_ID}"
echo "Region:   ${REGION}"
echo "Service:  ${SERVICE_NAME}"

# Step 1: Set GCP project
gcloud config set project "${PROJECT_ID}"

# Step 2: Build and submit container image via Google Cloud Build
echo "Building container image..."
cd "$(dirname "$0")/../backend"
gcloud builds submit --tag "${IMAGE_NAME}" .

# Step 3: Deploy to Cloud Run
# Note: --timeout 3600 is critical for long-lived WebSocket connections to Gemini Live
# Note: --session-affinity is recommended for stateful bidirectional sessions
echo "Deploying to Cloud Run in ${REGION}..."
gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --allow-unauthenticated \
    --timeout 3600 \
    --concurrency 80 \
    --cpu 2 \
    --memory 2Gi \
    --session-affinity \
    --set-env-vars "GCP_LOCATION=${REGION},GEMINI_LIVE_MODEL=gemini-3.1-flash-live,GEMINI_FLASH_MODEL=gemini-3.8-flash,EMBEDDING_MODEL=text-embedding-005"

# Step 4: Display service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --platform managed --region "${REGION}" --format 'value(status.url)')
echo ""
echo "=== Deployment Successful! ==="
echo "HTTP URL:      ${SERVICE_URL}"
echo "WebSocket URL: ${SERVICE_URL/http/ws}/ws/live"
echo "Health Check:  ${SERVICE_URL}/health"
