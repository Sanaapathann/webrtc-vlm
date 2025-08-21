from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import uvicorn
import cv2
import numpy as np
import time

app = FastAPI()

# ✅ Load model once at startup (YOLOv8 nano, fast)
model = YOLO("yolov8n.pt")

@app.post("/infer")
async def infer(file: UploadFile = File(...), frame_id: str = Form(...)):
    try:
        # Read image bytes
        image_bytes = await file.read()
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Inference
        start = time.time()
        results = model.predict(img, imgsz=320, conf=0.25, verbose=False)
        end = time.time()

        detections = []
        for r in results[0].boxes:
            detections.append({
                "label": model.names[int(r.cls)],
                "confidence": float(r.conf),
                "box": [float(x) for x in r.xyxy[0].tolist()]  # [x1,y1,x2,y2]
            })

        return JSONResponse({
            "frame_id": frame_id,
            "capture_ts": time.time(),
            "inference_time": end - start,
            "detections": detections
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
