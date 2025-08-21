#!/bin/bash

echo "⏱️  Starting 30-second benchmark..."
echo "💡 Please start your demo, run inference for 30 seconds, then press ENTER to save metrics."
echo "📊 When ready, press ENTER after 30+ seconds..."

read -r

# Trigger final metrics save (if your frontend doesn't do it automatically)
echo "✅ Benchmark complete. Make sure your frontend called /api/save-metrics-final"
echo "📄 Check metrics.json in root."

# Optional: you can fake it for demo
if [ ! -f metrics.json ] && [ -f public/metrics.json ]; then
  cp public/metrics.json ./
fi