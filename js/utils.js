export function distance(p1, p2) {
  if (!p1 || !p2) return 0;
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function lerp(start, end, amt) {
  return start + (end - start) * amt;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function mapRange(val, inMin, inMax, outMin, outMax) {
  if (Math.abs(inMax - inMin) < 0.0001) return outMin;
  const t = (val - inMin) / (inMax - inMin);
  const mapped = outMin + t * (outMax - outMin);
  return clamp(mapped, Math.min(outMin, outMax), Math.max(outMin, outMax));
}

// Check which fingers are extended based on wrist distance
export function getFingerStates(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return { thumb: false, index: false, middle: false, ring: false, pinky: false };
  }

  const wrist = landmarks[0];
  const getDistFromWrist = (idx) => {
    const lm = landmarks[idx];
    return Math.hypot(lm.x - wrist.x, lm.y - wrist.y);
  };

  return {
    thumb: getDistFromWrist(4) > getDistFromWrist(2) * 1.15,
    index: getDistFromWrist(8) > getDistFromWrist(6) * 1.05,
    middle: getDistFromWrist(12) > getDistFromWrist(10) * 1.05,
    ring: getDistFromWrist(16) > getDistFromWrist(14) * 1.05,
    pinky: getDistFromWrist(20) > getDistFromWrist(18) * 1.05,
  };
}

// Classify gesture: draw (index only), erase (fist), hover (index+middle)
export function detectGesture(landmarks) {
  const fingers = getFingerStates(landmarks);
  
  if (fingers.index && !fingers.middle && !fingers.ring) {
    return 'draw';
  }
  if (!fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
    return 'erase';
  }
  if (fingers.index && fingers.middle) {
    return 'hover';
  }
  return 'none';
}
