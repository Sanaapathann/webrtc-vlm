# 🚀 Real-time WebRTC + WASM & Server AI Multi-Object Detection

A **dual-mode architecture** that runs **object detection directly in the browser (WASM)** and supports **server-side inference via Python**. This project enables phone-to-laptop live streaming with real-time object detection using ONNX models — optimized for **low-resource laptops**.

## 🏗️ **Why Dual-Mode Inference?**

### **WASM Mode: Browser-Based Inference (Low-Resource)**
- ✅ **No GPU Required**: Runs on modest laptops (Intel i5, 8GB RAM)
- ✅ **Zero Server Load**: All inference happens in browser
- ✅ **Fast & Private**: No network roundtrip for detections
- ✅ **Optimized**: Quantized ONNX model, 320×240 input, 10 FPS

### **Server Mode: Python Backend (High Accuracy)**
- ✅ **Full AI Stack**: FastAPI + Ultralytics + ONNX Runtime
- ✅ **Scalable**: Can use GPU for higher accuracy models
- ✅ **Extensible**: Ready for YOLOv8, custom models, or cloud deployment

### **Microservices Benefits**
- 🔁 **Separation of Concerns**: WebRTC in Node.js, AI in Python
- ⚙️ **Independent Scaling**: Run AI on GPU server if needed
- 💡 **Technology Flexibility**: Best tool for each job
- 🛠️ **Easy Maintenance**: Debug and update services independently

---

## 🎯 **What This Project Does**

1. **Phone Camera Stream**: Capture live video from phone via WebRTC
2. **Laptop Receives Stream**: No app install — works in Chrome/Safari
3. **Dual Inference Modes**:
   - `MODE=wasm`: ONNX Runtime Web in browser
   - `MODE=server`: Python backend with YOLOv8
4. **Real-time Overlay**: Bounding boxes drawn on video
5. **Benchmarking**: Auto-run 30s test → `metrics.json`

---

## 🚀 **Quick Start (One Command)**

### **Prerequisites**
- Docker Desktop (Windows/Mac/Linux)
- Modern browser (Chrome/Firefox/Safari)
- Phone and laptop on same network (or ngrok)

### **Step 1: Clone Repo**
```bash
git clone https://github.com/Sanaapathann/webrtc-vlm.git
cd webrtc-vlm
```

### **Step 2: Start in WASM Mode (Recommended)**
```bash
MODE=wasm ./start.sh
```
or Start in server Mode

```bash
MODE=server ./start.sh
```

### **Step 3: Start with Public URL (Phone on Mobile Hotspot)**
```bash
./start.sh --ngrok
```

### **Step 4: Connect Phone**
1. Open `http://localhost:3000` (or ngrok URL) on **laptop**
2. A QR code appears
3. On **phone**, scan QR with camera
4. Allow camera access
5. See video + bounding boxes on laptop ✅

---

## 📱 **How to Use (Step by Step)**

### **On Laptop (Receiver)**
1. Run `./start.sh` or `MODE=server ./start.sh`
2. Open `http://localhost:3000` in browser
3. Wait for QR code
4. Watch real-time object detection

### **On Phone (Streamer)**
1. **Scan QR** with phone camera
2. Or manually open the same URL
3. Allow camera access
4. Your video streams to laptop

### **Switch Inference Mode**
```bash
# Low-resource mode (runs in browser)
./start.sh

# Server mode (sends frames to Python)
MODE=server ./start.sh
```

## 🏗️ **Architecture Overview**

```
┌─────────────┐    WebRTC    ┌─────────────────┐
│   Phone     │◄────────────►│  Node.js Server │
│  Camera     │   Signaling  │  (Port 3000)    │
│             │              └────────┬────────┘
└─────────────┘                       │
                                      ▼
                             ┌─────────────────┐
                             │  Python AI      │
                             │  (Port 8000)    │
                             │  FastAPI + YOLO │
                             └─────────────────┘
```

### **Data Flow (WASM Mode)**
1. Phone captures video → WebRTC → Laptop
2. Browser runs ONNX model on video
3. Detections sent via DataChannel
4. Overlay drawn on canvas

### **Data Flow (Server Mode)**
1. Phone → WebRTC → Laptop
2. Frames sent to `http://ai:8000/infer`
3. Python returns detections
4. Sent back via DataChannel → overlay

---

## 🔧 **Installation Options**

### **Option 1: Docker (Recommended)**
```bash
# One command setup
./start.sh

# Or with ngrok
./start.sh --ngrok
```

✅ Benefits:
- No local dependencies
- Reproducible environment
- Works on any OS
- Auto-QR generation

---

## 🤖 **AI Model Integration**

### **WASM Mode**
- **Model**: Quantized ONNX YOLOv5n
- **Input**: 320×240
- **Inference**: ONNX Runtime Web in browser
- **Latency**: ~320ms median

### **Server Mode**
- **Model**: YOLOv8n (Ultralytics)
- **Input**: 320×240
- **Inference**: FastAPI + ONNX Runtime
- **Extensible**: Add custom models

---

## 📊 **Performance & Benchmarking**

### **Run Benchmark**
```bash
# Auto-run after 30s in WASM mode
cat metrics.json
```

### **Sample Output**
```json
{
  "processed_fps": 10,
  "p95_e2e_latency_ms": 480,
  "median_e2e_latency_ms": 320,
  "uplink_kbps": 750,
  "downlink_kbps": 200
}
```

### **Performance Tips**
- ✅ Use `MODE=wasm` for low-resource devices
- ✅ Input: 320×240 for balance of quality & speed
- ✅ Frame rate: 10–15 FPS to reduce CPU load
- ✅ Use ngrok only when needed

---

## 🚨 **Troubleshooting Guide**

### ❌ Phone Won’t Connect?
- **Fix**: Use `./start.sh --ngrok` if on different networks
- **Fix**: Ensure both devices use same WiFi
- **Fix**: Disable mobile data on phone

### ❌ QR Code Not Scanning?
- **Fix**: Use `--ngrok` — avoids IP/firewall issues
- **Fix**: Refresh page and try again
- **Fix**: Use Google Lens (Android) or native camera (iOS)

### ❌ No Bounding Boxes in Server Mode?
- **Fix**: `MODE=server` is prototype — WASM mode is primary
- **Fix**: Ensure `python-multipart` installed
- **Fix**: Check `docker logs webrtc-ai-1`

### ❌ High CPU Usage?
- **Fix**: Use `MODE=wasm` — offloads to phone
- **Fix**: Lower resolution or FPS
- **Fix**: Close other apps

---

## 🔧 **Step-by-Step Setup**

### **1. Start the Demo**
```bash
# WASM mode (recommended)
./start.sh

# OR: Server mode
MODE=server ./start.sh

# OR: With public URL
./start.sh --ngrok
```

### **2. Open on Laptop**
- Go to `http://localhost:3000`
- Wait for QR code

### **3. Scan on Phone**
- Use camera to scan QR
- Allow camera access
- Video appears on laptop

### **4. See Results**
- Bounding boxes appear (WASM mode)
- `metrics.json` saved after 30s

---

## 🌐 **Network Configuration**

### **Ports Used**
- **3000**: Node.js WebRTC server
- **8000**: Python AI service (internal)
- **4040**: ngrok dashboard (if used)

### **Firewall Tips**
- Allow Docker through firewall
- Port 3000 must be accessible on local network

---

## 📱 **Mobile Device Tips**

### **Browser Compatibility**
- ✅ **iOS**: Safari (iOS 15+)
- ✅ **Android**: Chrome 80+
- ✅ **Desktop**: Chrome, Firefox, Edge

### **Camera Permissions**
- Always allow camera when prompted
- Try incognito mode if blocked

---

## 📁 **Project Structure**
```
webrtc-vlm/
├── 📁 public/                  # Frontend
│   ├── 📄 app.js               # WebRTC + detection logic
│   ├── 📄 wasm_infer.js        # ONNX Runtime Web
│   ├── 📄 index.html           # Receiver UI
│   └── 📄 receive.html         # Phone streamer
├── 📄 server.js                # Node.js signaling server
├── 📄 server_infer.py          # FastAPI + YOLOv8
├── 📄 Dockerfile               # Node.js container
├── 📄 Dockerfile.ai            # Python container
├── 📄 docker-compose.yml       # Service orchestration
├── 📄 start.sh                 # Startup script
├── 📄 metrics.json             # Auto-generated
├── 📄 report.md                # Design report
├── 📄 requirements.txt         # Python deps
└── 📄 README.md                # This file
```

---

## 🎯 **Use Cases**

### **Education & Remote Help**
- Students share workspace
- Remote debugging or guidance

### **Low-Resource Devices**
- Runs on old laptops, no GPU
- Ideal for developing regions

### **Privacy-Sensitive Apps**
- WASM mode: no data leaves browser
- No cloud costs or API keys

---

## 🔮 **Future Enhancements**

### **Planned Features**
- 🚀 Move WASM to Web Worker
- 🔄 Dynamic input resolution
- 📈 Real-time FPS/latency graph
- 💾 Save detection history

### **AI Improvements**
- 🧠 Support for custom ONNX models
- 🎯 Track objects across frames
- 🔊 Add audio streaming

---

## 🤝 **Contributing**

### **How to Contribute**
1. Fork the repo
2. Create feature branch
3. Test changes
4. Submit PR

### **Development Setup**
```bash
npm install
pip install -r requirements.txt
```

---

## 📞 **Support & Community**

### **Getting Help**
- **GitHub Issues**: Bug reports
- **README**: Clear setup guide
- **Loom Video**: 1-min demo

---

## 📄 **License**
MIT License — see [LICENSE](LICENSE)

---

## 🙏 **Acknowledgments**
- **ONNX Runtime**: For WASM inference
- **Ultralytics**: YOLO models
- **FastAPI**: Modern Python backend
- **WebRTC**: Real-time communication
- **ngrok**: Easy public access

---

## 🌟 **Star History**
If this project helps you, please give it a ⭐!

---

**Built with ❤️ by Sana Pathan**  
*Demonstrating real-time AI on a modest laptop*