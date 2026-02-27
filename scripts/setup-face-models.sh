#!/bin/bash
# Download face-api.js model weights to public/models/ for local serving.
# These models are required for browser-side face detection & descriptor extraction.
#
# Models used:
#   - tiny_face_detector: lightweight face detection
#   - face_landmark_68: facial landmark detection
#   - face_recognition: 128-d descriptor extraction

set -euo pipefail

MODEL_DIR="$(dirname "$0")/../public/models"
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

mkdir -p "$MODEL_DIR"

MODELS=(
  "tiny_face_detector_model-shard1"
  "tiny_face_detector_model-weights_manifest.json"
  "face_landmark_68_model-shard1"
  "face_landmark_68_model-weights_manifest.json"
  "face_recognition_model-shard1"
  "face_recognition_model-shard2"
  "face_recognition_model-weights_manifest.json"
)

echo "Downloading face-api.js models to $MODEL_DIR ..."

for file in "${MODELS[@]}"; do
  if [ -f "$MODEL_DIR/$file" ]; then
    echo "  [skip] $file (already exists)"
  else
    echo "  [download] $file"
    curl -fsSL "$BASE_URL/$file" -o "$MODEL_DIR/$file"
  fi
done

echo "Done. Models are in $MODEL_DIR"
