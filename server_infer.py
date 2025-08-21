# server_infer.py
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import uvicorn
import cv2
import numpy as np
import time

app = FastAPI()

# Load YOLO model
from ultralytics import YOLO
model = YOLO("yolov8n.pt")  # or use a quantized ONNX model later

@app.post("/infer")
async def infer(
    file: UploadFile = File(...),
    frame_id: str = Form(...),
    capture_ts: float = Form(...)
):
    try:
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Run inference
        results = model(img, stream=True)
        detections = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = box.conf.cpu().numpy()
                cls = int(box.cls.cpu().numpy())
                h, w = img.shape[:2]
                detections.append({
                    "label": model.names[cls],
                    "score": float(conf),
                    "xmin": float(x1 / w),
                    "ymin": float(y1 / h),
                    "xmax": float(x2 / w),
                    "ymax": float(y2 / h)
                })

        return JSONResponse({
            "frame_id": frame_id,
            "capture_ts": capture_ts,
            "recv_ts": time.time(),
            "inference_ts": time.time(),
            "detections": detections
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)