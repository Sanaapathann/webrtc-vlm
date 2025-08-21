# Real-time Multi-Object Detection from Phone via WebRTC

A browser-based demo that streams live video from your phone, runs real-time object detection, and overlays bounding boxes with minimal latency — all without installing any app on the phone.

Supports two modes:
- **WASM mode**: Inference in the browser (low-resource, no GPU needed)
- **Server mode**: Inference via Python backend (higher accuracy)

Includes full Docker setup, benchmarking, and metrics collection.

---

## 🚀 One-Command Launch

Run the entire system with one command:

```bash
# Clone the repo
git clone https://github.com/yourname/your-repo-name.git
cd your-repo-name

# Start in WASM mode (default, low-resource)
./start.sh

# OR: Start in server mode (requires Python)
MODE=server ./start.sh

# OR: Start with public URL (for phone on different network)
./start.sh --ngrok