// public/wasm_infer.js
(function(window){
  const DEFAULT_OPTIONS = {
    targetW: 320,
    targetH: 240,
    targetFPS: 10,
    frameDrop: true,
    metricsDurationSec: 30,
    serverUrl: 'http://localhost:8000/infer',
    useServerAI: false // <-- toggle here, or set window.USE_SERVER_AI externally
  };

  // minimal label map for common COCO / YOLO classes (extend if you need full 80)
  const LABEL_MAP = {
    0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorbike', 5: 'bus', 7: 'truck',
    16: 'bird', 17: 'cat', 18: 'dog', 15: 'bench'
  };

  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

 async function sendFrameToServer(frameId, canvas, capture_ts, serverUrl) {
  return new Promise(resolve => canvas.toBlob(async blob => {
    if (!blob) return resolve(null);
    const form = new FormData();
    form.append('file', blob, 'frame.jpg');
    form.append('frame_id', String(frameId));
    form.append('capture_ts', String(capture_ts));  // ← NEW: send capture timestamp
    form.append('width', String(canvas.width));
    form.append('height', String(canvas.height));
    try {
      const res = await fetch(serverUrl, { method: 'POST', body: form });
      if (!res.ok) {
        console.warn('Server returned', res.status);
        return resolve(null);
      }
      const json = await res.json();
      return resolve(json);
    } catch (err) {
      console.error('Error sending frame to server:', err);
      return resolve(null);
    }
  }, 'image/jpeg', 0.7));
}

  async function startWasmMode({ remoteVideo, overlayCanvas, dataChannel, options = {} }) {
    const opts = Object.assign({}, DEFAULT_OPTIONS, options);
    // allow external override
    if (window.USE_SERVER_AI !== undefined) opts.useServerAI = Boolean(window.USE_SERVER_AI);
    if (window.AI_SERVER_URL) opts.serverUrl = window.AI_SERVER_URL;

    try {
      await tf.setBackend('wasm');
      await tf.ready();
      console.log('TF backend ready:', tf.getBackend());
    } catch(e){
      console.warn('TF WASM init failed, falling back:', e);
      await tf.ready();
    }

    console.log('Loading coco-ssd model (for WASM mode)...');
    let model = null;
    try {
      model = await cocoSsd.load();
      console.log('coco-ssd loaded');
    } catch(e){
      console.warn('coco-ssd load failed (WASM mode unavailable):', e);
    }

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = opts.targetW;
    captureCanvas.height = opts.targetH;
    const cctx = captureCanvas.getContext('2d');

    const octx = overlayCanvas.getContext('2d');
    function resizeOverlay(){
      overlayCanvas.width = remoteVideo.clientWidth;
      overlayCanvas.height = remoteVideo.clientHeight;
    }
    window.addEventListener('resize', resizeOverlay);
    resizeOverlay();

    const metrics = { latencies: [], framesProcessed: 0, bytesSent: 0, lastPosted: null };
    let running = true, busy = false, frameId = 0, lastInferenceTs = 0;
    const minIntervalMs = 1000 / opts.targetFPS;

    async function loop(){
      while(running){
        const now = performance.now();
        const since = now - lastInferenceTs;
        if (opts.frameDrop && busy){ await sleep(10); continue; }
        if (since < minIntervalMs){ await sleep(Math.max(1, minIntervalMs - since)); continue; }
        if (remoteVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA){ await sleep(50); continue; }

        // draw to capture canvas (scaled)
        cctx.drawImage(remoteVideo, 0, 0, opts.targetW, opts.targetH);
        const capture_ts = Date.now();
        const thisFrameId = ++frameId;

        // estimate bytes by encoding jpeg (for bandwidth metric)
        const blob = await new Promise(res => captureCanvas.toBlob(res, 'image/jpeg', 0.6));
        const bytes = blob ? blob.size : 0;

        busy = true;
        lastInferenceTs = performance.now();

        let detections = [];
        try {
          if (opts.useServerAI) {
            const serverResp = await sendFrameToServer(thisFrameId, captureCanvas,capture_ts, opts.serverUrl);
            if (serverResp && Array.isArray(serverResp.detections)) {
              // server returns normalized coords { xmin,ymin,xmax,ymax, label, score }
              detections = serverResp.detections;
            } else {
              detections = [];
            }
          } else {
            if (!model) {
              console.warn('No local model available — skipping detection.');
              detections = [];
            } else {
              const localDet = await model.detect(captureCanvas, 10);
              // transform coco-ssd `bbox` format -> normalized { xmin... }
              detections = localDet.map(d => {
                const [x,y,w,h] = d.bbox;
                const xmin = x / opts.targetW;
                const ymin = y / opts.targetH;
                const xmax = (x + w) / opts.targetW;
                const ymax = (y + h) / opts.targetH;
                return { xmin, ymin, xmax, ymax, label: d.class, score: d.score };
              });
            }
          }
        } catch (err) {
          console.error('Inference error:', err);
          detections = [];
        }

        const overlay_display_ts = Date.now();

        // draw overlay (normalized coords)
        octx.clearRect(0,0,overlayCanvas.width,overlayCanvas.height);
        octx.lineWidth = 2;
        octx.font = '14px Arial';
        octx.textBaseline = 'top';
        detections.forEach(d=>{
          const x = d.xmin * overlayCanvas.width;
          const y = d.ymin * overlayCanvas.height;
          const w = (d.xmax - d.xmin) * overlayCanvas.width;
          const h = (d.ymax - d.ymin) * overlayCanvas.height;
          octx.strokeStyle = '#00FF00';
          octx.strokeRect(x, y, w, h);
          const labelText = `${d.label} ${(d.score*100).toFixed(1)}%`;
          const tw = octx.measureText(labelText).width;
          octx.fillStyle = 'rgba(0,255,0,0.25)';
          octx.fillRect(x, y-18, tw+6, 18);
          octx.fillStyle = '#000';
          octx.fillText(labelText, x+3, y-16);
        });

        // send via dataChannel (optional)
        if (dataChannel && dataChannel.readyState === 'open') {
          const msg = { frame_id: thisFrameId, capture_ts, overlay_display_ts, detections };
          try {
            const t = JSON.stringify(msg);
            dataChannel.send(t);
            metrics.bytesSent += t.length;
          } catch (e) { console.warn('DataChannel send failed', e); }
        }

        // metrics
        metrics.latencies.push(overlay_display_ts - capture_ts);
        metrics.framesProcessed += 1;
        metrics.bytesSent += bytes;

        busy = false;
        await sleep(5);
      }
    }

    loop();

    return {
      stop: () => { running = false; },
     async runBenchmark(durationSec = opts.metricsDurationSec) {
  console.log('📊 Benchmark running for', durationSec, 'seconds...');
  await sleep(durationSec * 1000);

  // Compute metrics
  const lat = metrics.latencies.slice().sort((a, b) => a - b);
  const median_latency_ms = lat.length ? lat[Math.floor(lat.length / 2)] : 0;
  const p95_latency_ms = lat.length ? lat[Math.floor(lat.length * 0.95)] : 0;
  const processed_fps = parseFloat((metrics.framesProcessed / durationSec).toFixed(2));
  const uplink_kbps = parseFloat(((metrics.bytesSent * 8) / durationSec / 1024).toFixed(2)); // bits, not bytes
  const downlink_kbps = 0; // not measuring downlink data (detections are small)

  const finalMetrics = {
    mode: opts.useServerAI ? "server" : "wasm",
    duration_sec: durationSec,
    median_latency_ms,
    p95_latency_ms,
    processed_fps,
    uplink_kbps,
    downlink_kbps,
    resolution: `${opts.targetW}x${opts.targetH}`,
    notes: "Latency = overlay_display_ts - capture_ts. Uplink = estimated from JPEG frames sent to server."
  };

  // ✅ Save as metrics.json via backend
  try {
    const response = await fetch('/api/save-metrics-final', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalMetrics)
    });
    if (response.ok) {
      console.log('✅ Final metrics.json generated successfully!');
      console.log('📋 Metrics:', finalMetrics);
    } else {
      console.warn('❌ Failed to save metrics.json:', await response.text());
    }
  } catch (err) {
    console.error('❌ Error saving metrics.json:', err);
  }

  return finalMetrics;
},
      getMetrics: () => metrics
    };
  }

  window.startWasmMode = startWasmMode;
})(window);
