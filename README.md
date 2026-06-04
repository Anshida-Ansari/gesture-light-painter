# Gesture-Controlled Light Painting Application

An interactive, browser-based digital light painting canvas that tracks hand movements in real time to generate glowing neon trails and synthesize spacey, responsive synthesizer sweeps. 

Built using pure HTML5, CSS3, and modern Vanilla JavaScript (ES6+), powered by **MediaPipe Hands** and the Web Audio API. Zero dependencies, zero build tools, and runs entirely in the browser.

---

## 🚀 Key Features

*   **Real-Time Hand Tracking:** Leverages MediaPipe Hands (Lite model) for lightning-fast, high-precision detection of 21 landmarks directly inside the browser.
*   **Premium Neon Renderer:** Implements a hardware-accelerated, three-pass canvas draw loop with HSL coloring and CSS filters to create realistic neon glow effects and floating sparks.
*   **Inertial Brush Lag:** Integrates a physical drag-and-inertia smoothing algorithm to simulate organic, fluid line sags and sweeps.
*   **Interactive Synthesizer:** Built using the Web Audio API. Generates sound sweeps with zero clicking or pops:
    *   **Pitch (Frequency):** Modulated by vertical screen position (Y-axis) + movement speed.
    *   **Volume (Gain):** Modulated by movement speed (fades out completely when stationary).
    *   **Filter Cutoff:** Modulated by horizontal screen position (X-axis) for rich, sweepy filter textures.
*   **Vector Eraser:** Wipe canvas lines by folding your hand into a closed fist and sweeping it over existing lines. Includes custom grey ash particle feedback.
*   **Glassmorphic UI Control Sidebar:** Adjustable settings for neon colors, customized HTML5 color picker, brush size, trail decay duration, oscillator waveforms (Sine, Triangle, Sawtooth, Square), and live tracker HUD.

---

## 🎮 Hand Gesture Controls

| Gesture | Mode | Function |
| :--- | :--- | :--- |
| **☝️ Index Finger Extended** | **Paint** | Draws glowing trails on the canvas and triggers synthesizer modulation. |
| **✌️ Index & Middle Extended** | **Hover** | Moves the target cursor overlay and modulates filter cutoff sweeps *without* painting lines. |
| **✊ Closed Fist** | **Erase** | Removes painted lines that pass close to the brush center with ash particle feedback. |

---

## 📁 File Structure

```
gesture-light-painter/
├── index.html           # Main HTML structure & MediaPipe CDN imports
├── css/
│   └── style.css        # Glassmorphic sci-fi UI styling & neon custom variables
└── js/
    ├── app.js           # Main coordinator linking tracker, renderer, audio, & UI
    ├── handTracker.js   # Webcam media stream & MediaPipe Hands wrapper
    ├── canvasRenderer.js# Canvas drawing passes, smoothing, particles, and eraser
    ├── audioController.js# Web Audio synth graph setup & parameter mapping
    └── utils.js         # Math helpers (lerp, mapRange, distance) & gesture detection
```

---

## 🛠️ How to Run Locally

Because browser security models require a **Secure Context** (`localhost` or `https://`) to access the webcam via `navigator.mediaDevices.getUserMedia`, you must run the app through a local web server.

Here are a few quick, zero-install methods to start the application:

### Method 1: Using Node.js (Recommended)
If you have Node.js installed, open a command prompt inside the project folder and run:
```bash
npx http-server
```
Then open `http://localhost:8080` in your web browser.

### Method 2: Using Python
If you have Python installed, run this command in your terminal inside the project folder:

**Python 3.x:**
```bash
python -m http.server 8000
```

**Python 2.x:**
```bash
python -m SimpleHTTPServer 8000
```
Then open `http://localhost:8000` in your browser.

### Method 3: VS Code Live Server Extension
If using Visual Studio Code:
1. Open the project folder in VS Code.
2. Install the **Live Server** extension by Ritwick Dey.
3. Click the **Go Live** button in the bottom right corner of the status bar.

---

## ⚡ Performance Optimizations

To target a consistent **60 FPS** and low CPU overhead:
1.  **MediaPipe Lite Model (`modelComplexity: 0`):** Specifically configured to run the lighter model version, reducing ML inference latency.
2.  **Non-overlapping Frame Loop:** The `HandTracker` frame loop waits for MediaPipe to finish parsing the previous frame before pushing the next, preventing frame pile-ups.
3.  **Hardware-Accelerated Glow:** Replaces slow `shadowBlur` operations with multi-pass draws using CSS filters (`ctx.filter = 'blur(...)'`), which are heavily accelerated on modern GPUs.
4.  **Vector Eraser:** Scans and filters lines mathematical-style rather than manipulating heavy, raw image matrices.
5.  **Audio Glide:** Employs exponential ramp mapping (`setTargetAtTime`) to eliminate clipping, pops, and clicking, keeping CPU audio rendering lightweight.
