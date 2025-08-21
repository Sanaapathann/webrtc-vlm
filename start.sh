#!/bin/bash

# Clean up port 3000
echo "🧹 Killing any process on port 3000..."
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9 > /dev/null 2>&1 || true

MODE=${MODE:-wasm}
export MODE

USE_NGROK=true
if [[ "$1" == "--ngrok" ]]; then
  USE_NGROK=true
  shift
fi

echo "🚀 Starting WebRTC Demo | MODE=$MODE | PORT=3000 | NGROK=$USE_NGROK"
echo "🔁 Building and starting Docker container..."

# Build and start Docker
docker-compose up --build -d

sleep 3

if [ "$USE_NGROK" = true ]; then
  echo "🔐 Starting ngrok..."
  # Use Windows ngrok if available
  if command -v ngrok.exe &> /dev/null; then
    ngrok.exe http 3000 > ngrok.log 2>&1 &
  elif command -v ngrok &> /dev/null; then
    ngrok http 3000 > ngrok.log 2>&1 &
  else
    echo "❌ ngrok not found. Download from https://ngrok.com/download"
    exit 1
  fi
  NGROK_PID=$!

  sleep 5

  NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o "https://[-0-9a-zA-Z]*\\.ngrok-free\\.app")
  if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL. Check ngrok.log"
    cat ngrok.log
    exit 1
  fi

  echo "🌐 Public URL: $NGROK_URL"
  echo "✅ Open in browser: $NGROK_URL"
  echo "📱 Scan the QR code shown in the browser"

  echo "💡 Press Ctrl+C to stop."
  trap "kill $NGROK_PID; docker-compose down" EXIT
  wait $NGROK_PID
else
  echo "✅ App available at: http://localhost:3000"
  echo "💡 Open in browser and scan QR."
  docker-compose up
fi