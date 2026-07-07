import cv2
import numpy as np
import sys
import json

def bank_check_scan(image):
    """
    Convert label to crisp black & white like a bank check mobile deposit scan.
    Uses adaptive thresholding to handle uneven lighting and shadows perfectly.
    Returns a 3-channel BGR image that is pure black-and-white.
    """
    # Step 1: Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Step 2: Denoise to remove camera grain before thresholding
    gray = cv2.fastNlMeansDenoising(gray, h=8, templateWindowSize=7, searchWindowSize=21)

    # Step 3: Adaptive threshold — handles shadows and uneven lighting perfectly
    # Block size 31 = checks local 31×31 pixel neighborhood for threshold decision
    bw = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31,
        C=12
    )

    # Step 4: Slight morphological cleanup to smooth jagged edges on text
    kernel = np.ones((2, 2), np.uint8)
    bw = cv2.morphologyEx(bw, cv2.MORPH_CLOSE, kernel)

    # Step 5: Convert back to 3-channel so it saves as RGB image
    bw_bgr = cv2.cvtColor(bw, cv2.COLOR_GRAY2BGR)
    return bw_bgr

def deskew_label(roi):
    """
    Attempt to deskew the ROI using the largest white rectangle inside it.
    Returns the deskewed image, or the original ROI if deskew fails.
    """
    h, w = roi.shape[:2]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    white = cv2.inRange(hsv, (0, 0, 140), (180, 80, 255))
    white = cv2.morphologyEx(white, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    white = cv2.morphologyEx(white, cv2.MORPH_OPEN, np.ones((10, 10), np.uint8))

    contours, _ = cv2.findContours(white, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return roi

    largest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)

    # Only use for deskew if contour is large enough (>30% of ROI)
    if area < w * h * 0.30:
        return roi

    # Get rotation angle from minAreaRect
    rect = cv2.minAreaRect(largest)
    angle = rect[2]

    # Only deskew if angle is significant but not extreme (avoid flips)
    if abs(angle) < 1.0 or abs(angle) > 45:
        return roi

    # Rotate to correct skew
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    deskewed = cv2.warpAffine(roi, M, (w, h),
                               flags=cv2.INTER_LANCZOS4,
                               borderMode=cv2.BORDER_REPLICATE)
    sys.stderr.write(f"Deskew: corrected {angle:.1f}° rotation\n")
    return deskewed

def extract_label(image_path, out_path, label_box_str=None):
    try:
        image = cv2.imread(image_path)
        if image is None:
            return json.dumps({"success": False, "error": "Could not read image"})

        h, w = image.shape[:2]

        if not label_box_str:
            return json.dumps({"success": False, "error": "No label_box provided"})

        # Parse bounding box [ymin, xmin, ymax, xmax] normalized 0-1000
        parts = [int(x) for x in label_box_str.split(',')]
        if len(parts) != 4:
            return json.dumps({"success": False, "error": "label_box must have 4 values"})

        ymin, xmin, ymax, xmax = parts

        # Tight 3% padding to stay on the label
        pad_x = int((xmax - xmin) * 0.03)
        pad_y = int((ymax - ymin) * 0.03)

        T = max(0, int((ymin / 1000) * h) - pad_y)
        L = max(0, int((xmin / 1000) * w) - pad_x)
        B = min(h, int((ymax / 1000) * h) + pad_y)
        R = min(w, int((xmax / 1000) * w) + pad_x)

        crop_area = (B - T) * (R - L)
        img_area  = h * w

        # Sanity check: if box covers >90% of image, the AI mislabeled — try white region
        if crop_area / img_area > 0.90:
            sys.stderr.write("⚠ Box covers full image — trying white-region refinement\n")
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            wm  = cv2.inRange(hsv, (0, 0, 150), (180, 60, 255))
            wm  = cv2.morphologyEx(wm, cv2.MORPH_CLOSE, np.ones((30,30), np.uint8))
            wm  = cv2.morphologyEx(wm, cv2.MORPH_OPEN,  np.ones((10,10), np.uint8))
            cnts, _ = cv2.findContours(wm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if cnts:
                best = max(cnts, key=cv2.contourArea)
                if cv2.contourArea(best) / img_area > 0.03:
                    bx, by, bw, bh = cv2.boundingRect(best)
                    T, L, B, R = by, bx, by+bh, bx+bw
                    sys.stderr.write(f"  White region crop: T={T} L={L} B={B} R={R}\n")

        roi = image[T:B, L:R]
        sys.stderr.write(f"Crop: T={T} L={L} B={B} R={R} -> {R-L}x{B-T}\n")

        # Deskew if the label is at a slight angle
        roi = deskew_label(roi)

        # Resize to exact 4x6 at 200dpi (800x1200 portrait) BEFORE binarizing
        # (resize on color first for better quality, then binarize)
        cw, ch = roi.shape[1], roi.shape[0]
        if cw > ch:  # landscape → rotate to portrait
            roi = cv2.rotate(roi, cv2.ROTATE_90_CLOCKWISE)
        resized = cv2.resize(roi, (800, 1200), interpolation=cv2.INTER_LANCZOS4)

        # Apply bank-check style black & white conversion
        final = bank_check_scan(resized)

        # Save as high-quality JPEG (binarized images compress very well)
        cv2.imwrite(out_path, final, [cv2.IMWRITE_JPEG_QUALITY, 98])
        return json.dumps({"success": True, "method": "bank_check_bw"})

    except Exception as e:
        import traceback
        return json.dumps({"success": False, "error": str(e), "trace": traceback.format_exc()})

if __name__ == "__main__":
    img_path      = sys.argv[1]
    out_path      = sys.argv[2]
    label_box_str = sys.argv[3] if len(sys.argv) > 3 else ""
    print(extract_label(img_path, out_path, label_box_str or None))
