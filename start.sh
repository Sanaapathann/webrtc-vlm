#!/usr/bin/env bash
set -euo pipefail

MODE=${MODE:-wasm}
PORT=${PORT:-3000}
USE_NGROK=true

# Parse --ngrok flag
while [[ $# -gt 0 ]]; do
  case $1 in
    --ngrok)
      USE_NGROK=true
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

export MODE PORT

echo "🚀 Starting WebRTC Demo | MODE=$MODE | PORT=$PORT | NGROK=$USE_NGROK"

# Build and start Docker
echo "🔁 Building and starting Docker container..."
docker-compose up --build -d

# Wait for server
sleep 3

if [[ "$USE_NGROK" == "true" ]]; then
  echo "🔐 Checking ngrok..."
  if ! command -v ngrok >/dev/null 2>&1; then
    echo "❌ ngrok not found. Install from https://ngrok.com" >&2
    exit 1
  fi

  echo "🔗 Starting ngrok..."
  ngrok http $PORT --log=stdout > ngrok.log 2>&1 &
  NGROK_PID=$!

  sleep 5

  NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o "https://[-0-9a-zA-Z]*\\.ngrok-free\\.app")
  if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL. Check:"
    cat ngrok.log
    exit 1
  fi

  echo "🌐 Public URL: $NGROK_URL"
  echo "$NGROK_URL" > public/ngrok-link.txt

  echo "📱 Scan this QR:"
  echo "$NGROK_URL" | qrencode -t ansiutf8

  echo "✅ App is live at: $NGROK_URL"
  echo "💡 Open this URL in your browser to see the QR code"
  trap "kill $NGROK_PID; docker-compose down" EXIT
  wait $NGROK_PID
else
  echo "✅ App available at: http://localhost:$PORT"
  echo "💡 Open in browser and scan QR."
  docker-compose up
fi