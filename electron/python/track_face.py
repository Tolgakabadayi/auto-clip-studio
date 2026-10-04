import sys
import os
import argparse
import json
import math

def parse_args():
    parser = argparse.ArgumentParser(description="AutoClip AI Face & Speaker Tracking for 9:16 Smart Cropping")
    parser.add_argument("--video", required=True, help="Path to input video file")
    parser.add_argument("--start", type=float, default=0.0, help="Start time in seconds")
    parser.add_argument("--duration", type=float, default=30.0, help="Duration in seconds")
    parser.add_argument("--model", default=None, help="Path to YuNet ONNX model")
    parser.add_argument("--sample_fps", type=float, default=4.0, help="Frames per second to sample for face detection")
    return parser.parse_args()

def main():
    args = parse_args()

    if not os.path.exists(args.video):
        print(f"Error: Video file not found: {args.video}", file=sys.stderr)
        sys.exit(1)

    import cv2
    import numpy as np

    # Resolve YuNet ONNX model path
    model_path = args.model
    if not model_path or not os.path.exists(model_path):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        candidates = [
            os.path.join(script_dir, "face_detection_yunet_2023mar.onnx"),
            os.path.join(script_dir, "models", "face_detection_yunet_2023mar.onnx"),
        ]
        for c in candidates:
            if os.path.exists(c):
                model_path = c
                break

    detector = None
    if model_path and os.path.exists(model_path):
        import tempfile
        import shutil

        safe_model_path = model_path
        try:
            model_path.encode('ascii')
        except UnicodeEncodeError:
            temp_dir = tempfile.gettempdir()
            safe_model_path = os.path.join(temp_dir, 'autoclip_face_yunet.onnx')
            try:
                if not os.path.exists(safe_model_path) or os.path.getsize(safe_model_path) != os.path.getsize(model_path):
                    shutil.copyfile(model_path, safe_model_path)
            except Exception:
                safe_model_path = model_path

        try:
            detector = cv2.FaceDetectorYN.create(
                model=safe_model_path,
                config="",
                input_size=(320, 320),
                score_threshold=0.6,
                nms_threshold=0.3,
                top_k=10
            )
        except Exception as e:
            print(f"[Warning] Failed to initialize YuNet detector: {e}", file=sys.stderr)
            detector = None

    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        print(f"Error: Could not open video: {args.video}", file=sys.stderr)
        sys.exit(1)

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1920)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1080)

    # Calculate 9:16 target crop box
    crop_height = height
    crop_width = int(round(height * 9.0 / 16.0))
    if crop_width % 2 != 0:
        crop_width += 1
    max_crop_x = max(0, width - crop_width)
    default_crop_x = max_crop_x / 2.0

    # If video is already 9:16 or portrait, no horizontal crop needed
    if width <= crop_width:
        result = {
            "crop_x": 0,
            "crop_y": 0,
            "crop_width": width,
            "crop_height": height,
            "face_detected": False,
            "filter_complex": f"scale=1080:1920:flags=lanczos",
            "message": "Video zaten dikey (9:16) formatında."
        }
        print(f"__RESULT__{json.dumps(result)}__RESULT__")
        sys.exit(0)

    start_frame = int(max(0, args.start * video_fps))
    duration_frames = int(args.duration * video_fps)
    end_frame = min(total_video_frames, start_frame + duration_frames) if total_video_frames > 0 else start_frame + duration_frames

    # Determine frame step to sample ~args.sample_fps frames per second
    sample_step = max(1, int(round(video_fps / max(1.0, args.sample_fps))))

    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    tracked_x_list = []
    current_frame = start_frame
    prev_face_x = default_crop_x + (crop_width / 2.0)
    faces_detected_count = 0

    # Detection scale for fast inference
    det_w, det_h = 320, int(round(320 * (height / width)))
    if detector:
        detector.setInputSize((det_w, det_h))

    scale_x = width / float(det_w)
    scale_y = height / float(det_h)

    while current_frame < end_frame:
        ret, frame = cap.read()
        if not ret or frame is None:
            break

        if (current_frame - start_frame) % sample_step == 0:
            face_center_x = None

            if detector:
                try:
                    small_frame = cv2.resize(frame, (det_w, det_h))
                    _, faces = detector.detect(small_frame)

                    if faces is not None and len(faces) > 0:
                        faces_detected_count += 1
                        # Select best face: largest area and nearest to previous speaker position
                        best_face = None
                        best_score = -1e9

                        for f in faces:
                            fx, fy, fw, fh = f[0] * scale_x, f[1] * scale_y, f[2] * scale_x, f[3] * scale_y
                            conf = f[-1]
                            area = fw * fh
                            center_x = fx + (fw / 2.0)

                            # Scoring: Area + confidence - penalty for distance from prev speaker
                            dist_prev = abs(center_x - prev_face_x)
                            score = (area * 0.7) + (conf * 5000) - (dist_prev * 2.0)

                            if score > best_score:
                                best_score = score
                                best_face = (center_x, fx, fy, fw, fh)

                        if best_face:
                            face_center_x = best_face[0]
                            prev_face_x = face_center_x
                except Exception as det_err:
                    pass

            if face_center_x is not None:
                # Calculate ideal crop X for this face
                ideal_crop_x = face_center_x - (crop_width / 2.0)
                clamped_crop_x = max(0.0, min(float(max_crop_x), ideal_crop_x))
                tracked_x_list.append((current_frame / video_fps, clamped_crop_x))
            elif tracked_x_list:
                # Hold previous smoothed crop X
                tracked_x_list.append((current_frame / video_fps, tracked_x_list[-1][1]))
            else:
                # Fallback to center
                tracked_x_list.append((current_frame / video_fps, default_crop_x))

        current_frame += 1

    cap.release()

    if not tracked_x_list:
        final_crop_x = int(round(default_crop_x))
        result = {
            "crop_x": final_crop_x,
            "crop_y": 0,
            "crop_width": crop_width,
            "crop_height": crop_height,
            "face_detected": False,
            "filter_complex": f"crop={crop_width}:{crop_height}:{final_crop_x}:0,scale=1080:1920:flags=lanczos",
            "message": "Yüz tespit edilemedi, merkez kırpma uygulandı."
        }
        print(f"__RESULT__{json.dumps(result)}__RESULT__")
        sys.exit(0)

    # Temporal smoothing (EMA with cut detection)
    smoothed_x = []
    alpha = 0.25  # Smooth pan inertia
    cut_threshold = 220.0  # Pixel jump to trigger instant camera cut instead of pan

    current_val = tracked_x_list[0][1]
    for t, raw_x in tracked_x_list:
        if abs(raw_x - current_val) > cut_threshold:
            # Shot / Speaker cut! Jump immediately
            current_val = raw_x
        else:
            # Smooth pan
            current_val = alpha * raw_x + (1.0 - alpha) * current_val
        smoothed_x.append(current_val)

    avg_crop_x = int(round(float(np.median(smoothed_x))))
    avg_crop_x = max(0, min(max_crop_x, avg_crop_x))
    # Make sure crop_x is even for ffmpeg yuv420p compliance
    if avg_crop_x % 2 != 0:
        avg_crop_x -= 1

    face_detected_ratio = (faces_detected_count / max(1, len(tracked_x_list))) * 100.0

    result = {
        "crop_x": avg_crop_x,
        "crop_y": 0,
        "crop_width": crop_width,
        "crop_height": crop_height,
        "face_detected": faces_detected_count > 0,
        "detection_confidence_pct": round(face_detected_ratio, 1),
        "filter_complex": f"crop={crop_width}:{crop_height}:{avg_crop_x}:0,scale=1080:1920:flags=lanczos",
        "message": (
            f"Konuşmacı yüzü tespit edildi (%{round(face_detected_ratio)} karede aktif). 9:16 akıllı yüz odaklama uygulandı."
            if faces_detected_count > 0
            else "Konuşmacı yüzü bulunamadı, video merkezi 9:16 olarak kadrajlandı."
        )
    }

    print(f"__RESULT__{json.dumps(result)}__RESULT__")
    sys.exit(0)

if __name__ == "__main__":
    main()
