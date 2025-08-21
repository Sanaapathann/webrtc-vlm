// public/app.js

// DOM refs
const remoteVideo    = document.getElementById('remoteVideo');
const overlayCanvas  = document.getElementById('overlayCanvas');
const qrcodeDiv      = document.getElementById('qrcode');
const statusElement  = document.getElementById('status');

// 🌐 Global: track inference mode ("wasm" or "server")
let inferenceMode = "wasm";  

let peerConnection;
let dataChannel;
const SIGNALING_HOST = window.__PUBLIC_HOST__ || window.location.hostname;

// Utility: generate random 6-char ID
function generateID(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('').slice(0, len);
}

// Update status bar
function updateStatus(msg, type = '') {
  statusElement.textContent = msg;
  statusElement.className = type;
}

// Resize overlay to video dims
function resizeCanvas() {
  if (remoteVideo.videoWidth > 0 && remoteVideo.videoHeight > 0) {
    overlayCanvas.width = remoteVideo.videoWidth;
    overlayCanvas.height = remoteVideo.videoHeight;
    console.log('🎨 Resized overlay to:', overlayCanvas.width, 'x', overlayCanvas.height);
  }
}

// Poll for answer until timeout
async function waitForAnswer(id, timeout = 120000, interval = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    updateStatus(`Waiting for phone... ${(Math.floor((Date.now()-start)/1000))}s`);
    try {
      const res = await fetch(`/api/get-answer/${id}`);
      if (res.ok) {
        const ans = await res.json();
        console.log('💾 Received answer:', ans);
        return ans;
      }
    }
    catch (e) {
      console.warn('⚠️ Poll error:', e);
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Answer timeout');
}

// Draw detections on canvas
function drawDetections({ detections }) {
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  detections.forEach(d => {
    const x = d.xmin * overlayCanvas.width;
    const y = d.ymin * overlayCanvas.height;
    const w = (d.xmax - d.xmin) * overlayCanvas.width;
    const h = (d.ymax - d.ymin) * overlayCanvas.height;
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth   = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#00FF00';
    ctx.font      = '16px Arial';
    ctx.fillText(`${d.label} ${(d.score*100).toFixed(1)}%`, x, y > 20 ? y - 5 : y + 20);
  });
}

// Handle detection message from data channel
function handleDetectionMessage(evt) {
  try {
    const msg = JSON.parse(evt.data);
    const { frame_id, capture_ts, detections } = msg;

    // Record display time for latency calculation
    const overlay_display_ts = Date.now();
    const endToEndLatency = overlay_display_ts - capture_ts;
    console.log(`📊 Latency for frame ${frame_id}: ${endToEndLatency}ms`);

    drawDetections({ detections, capture_ts, overlay_display_ts });
  }
  catch (err) {
    console.error('❌ Detection parse error:', err);
  }
}

// Generate QR code for phone to scan
function generateQRCode(url) {
  qrcodeDiv.innerHTML = '';
  new QRCode(qrcodeDiv, {
    text: url,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

// Initialize WebRTC connection
async function initWebRTC() {
  try {
    peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
        // Add TURN if needed
        // { urls: 'turn:relay.metered.ca:443', username: 'username', credential: 'password' }
      ]
    });

    peerConnection.onicegatheringstatechange = () => 
      console.log("💻 ICE gathering state:", peerConnection.iceGatheringState);
    peerConnection.oniceconnectionstatechange = () => 
      console.log("💻 ICE connection state:", peerConnection.iceConnectionState);
    peerConnection.onconnectionstatechange = () => 
      console.log("💻 Peer connection state:", peerConnection.connectionState);

    // DataChannel for receiving detections
    dataChannel = peerConnection.createDataChannel('detections');
    dataChannel.onopen = () => updateStatus('Connected — waiting for detections...', 'success');
    dataChannel.onmessage = handleDetectionMessage;

    // Handle incoming video stream
    peerConnection.ontrack = (evt) => {
  console.log('🎥 ontrack event:', evt.streams);
  if (evt.streams && evt.streams[0]) {
    const stream = evt.streams[0];
    remoteVideo.srcObject = stream;
    remoteVideo.muted = true;
    remoteVideo.play().catch(console.warn);
    updateStatus('📺 Video stream received!', 'success');
    resizeCanvas();

    if (inferenceMode === "wasm") {
      console.log("⚡ Running WASM inference in browser");
      if (typeof startWasmMode !== 'undefined' && !window._wasmStarted) {
        window._wasmStarted = true;
        startWasmMode({ remoteVideo, overlayCanvas, dataChannel }).then(handle => {
          window.wasmHandle = handle;
          handle.runBenchmark(30).then(metrics => {
            fetch('/api/save-metrics-final', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(metrics)
            });
          });
        });
      }
    } else if (inferenceMode === "server") {
      console.log("⚡ Sending frames to server for inference");

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.autoplay = true;

      video.onloadedmetadata = () => {
        canvas.width = 320;
        canvas.height = 240;
      };

      const interval = setInterval(() => {
        if (!video.videoWidth) return;

        // Draw frame
        ctx.drawImage(video, 0, 0, 320, 240);

        // Convert to JPEG blob
        canvas.toBlob(async (blob) => {
          const formData = new FormData();
          formData.append('file', blob, 'frame.jpg');
          formData.append('frame_id', Date.now().toString());
          formData.append('capture_ts', Date.now());

          try {
            const res = await fetch('/api/infer-ai', {
              method: 'POST',
              body: formData
            });
            const detection = await res.json();
            if (detection.detections && dataChannel.readyState === 'open') {
              dataChannel.send(JSON.stringify(detection));
            }
          } catch (err) {
            console.error('Inference failed:', err);
          }
        }, 'image/jpeg', 0.7);
      }, 100); // 10 FPS

      // Stop on disconnect
      peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'closed') {
          clearInterval(interval);
        }
      };
    }
  }
};
    // Request video/audio
    peerConnection.addTransceiver('video', { direction: 'recvonly' });
    peerConnection.addTransceiver('audio', { direction: 'recvonly' });

    // Create & send offer
    const offer = await peerConnection.createOffer();
    console.log('Offer has video m-line?', offer.sdp.includes('\nm=video'));
    await peerConnection.setLocalDescription(offer);

    const offerID = generateID();
    const saveRes = await fetch(`/api/save-offer/${offerID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offer)
    });
    if (!saveRes.ok) throw new Error(`save-offer ${saveRes.status}`);
    console.log('💾 Offer saved, ID =', offerID);

    // Generate QR code for phone to scan

// Use current host (works for ngrok and localhost)
const host = window.location.host;
const protocol = window.location.protocol;
const url = `${protocol}//${host}/receive.html?id=${offerID}`;
    generateQRCode(url);
    updateStatus('📱 Scan QR code with your phone', 'info');

    // Wait for answer from phone
    const answer = await waitForAnswer(offerID);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log('✅ Remote answer applied');
    updateStatus('✅ Phone connected!', 'success');
  }
  catch (err) {
    console.error('❌ initWebRTC error:', err);
    updateStatus('Error: ' + err.message, 'error');
  }
}

function startServerInference(stream, dataChannel) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.autoplay = true;

  video.onloadedmetadata = () => {
    canvas.width = 320;
    canvas.height = 240;
  };

  const interval = setInterval(() => {
    if (!video.videoWidth) return;

    // Resize and draw frame
    ctx.drawImage(video, 0, 0, 320, 240);
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      formData.append('frame_id', Date.now().toString());
      formData.append('capture_ts', Date.now());

      try {
        const res = await fetch('/api/infer-ai', {
          method: 'POST',
          body: formData
        });
        const detection = await res.json();
        if (detection.detections) {
          dataChannel.send(JSON.stringify(detection));
        }
      } catch (err) {
        console.error('Inference failed:', err);
      }
    }, 'image/jpeg', 0.7);
  }, 100); // 10 FPS

  return () => clearInterval(interval);
}

// On page load
window.addEventListener('load', () => {
  // 👉 Fetch mode from server
  fetch('/api/mode')
    .then(r => r.json())
    .then(({ mode }) => {
      inferenceMode = mode;
      console.log("🔁 Inference mode loaded:", mode);
      updateStatus(`Mode: ${mode.toUpperCase()} (auto-loaded)`, "info");
    })
    .catch(err => {
      console.warn("⚠️ Could not load mode, using default:", inferenceMode);
    });

  // Resize canvas when video plays
  remoteVideo.addEventListener('play', () => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  });

  // Handle mode toggle via radio buttons
  document.querySelectorAll('input[name="inferMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      inferenceMode = e.target.value;
      console.log("🔀 Inference mode switched to:", inferenceMode);
      updateStatus(`Mode switched to: ${inferenceMode.toUpperCase()}`, "info");
    });
  });

  // Start WebRTC
  initWebRTC();
});