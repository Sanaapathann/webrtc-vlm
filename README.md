# 🌐 Real-time WebRTC VLM: Multi-Object Detection from Phone to Browser

A reproducible demo that performs **real-time object detection** on live video streamed from a phone via WebRTC. The system processes frames, returns bounding boxes and labels, and overlays them on the video in near real-time — all without installing any app on the phone.

Supports dual inference modes:
- ✅ **WASM mode**: On-device inference (low-resource, runs on modest laptop)
- ✅ **Server mode**: Backend inference (Python/Node.js)

Includes Docker, ngrok support, benchmarking, and full documentation.

---

## 🚀 One-Command Launch

Run the entire system with a single script:

```bash
# Clone the repo
git clone https://github.com/Sanaapathann/webrtc-vlm.git
cd webrtc-vlm

# Start in WASM mode (default, low-resource)
./start.sh

# OR: Start in server mode (requires Python backend)
MODE=server ./start.sh

# OR: Start with public URL (for phone on different network)
./start.sh --ngrok