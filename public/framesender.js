// public/frameSender.js
async function sendFrameToServer(frameId, canvas) {
  return new Promise(resolve => 
    canvas.toBlob(async blob => {
      const form = new FormData();
      form.append('file', blob, 'frame.jpg');
      form.append('frame_id', frameId);

      try {
        const res = await fetch('http://localhost:8000/infer', { 
          method: 'POST', 
          body: form 
        });
        resolve(await res.json());
      } catch (err) {
        console.error("❌ Frame send failed:", err);
        resolve(null);
      }
    }, 'image/jpeg', 0.7)
  );
}
window.sendFrameToServer = sendFrameToServer; // expose globally
