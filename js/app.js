import { HandTracker } from './handTracker.js';
import { CanvasRenderer } from './canvasRenderer.js';
import { AudioController } from './audioController.js';
import { detectGesture } from './utils.js';

let tracker = null;
let renderer = null;
let audio = null;

let cursorInfo = {
  x: 0,
  y: 0,
  isDrawing: false,
  gesture: 'none',
  active: false
};

let mirrorMode = true;
let webcamOverlayMode = 'semi';
let fps = 0;
let lastFpsUpdate = 0;
let frameCount = 0;

const landingModal = document.getElementById('landing-modal');
const startBtn = document.getElementById('start-btn');
const errorOverlay = document.getElementById('error-overlay');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');

const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');

const clearBtn = document.getElementById('clear-btn');
const muteBtn = document.getElementById('mute-btn');
const mirrorToggle = document.getElementById('mirror-toggle');
const camToggle = document.getElementById('cam-toggle');

const sizeSlider = document.getElementById('size-slider');
const sizeVal = document.getElementById('size-val');
const fadeSlider = document.getElementById('fade-slider');
const fadeVal = document.getElementById('fade-val');

const colorSwatches = document.querySelectorAll('.color-swatch');
const customColorInput = document.getElementById('custom-color');
const rainbowBtn = document.getElementById('rainbow-btn');

const waveBtns = document.querySelectorAll('.wave-btn');
const presetCards = document.querySelectorAll('.preset-card');

const gestureIndicator = document.getElementById('gesture-indicator');
const statusIndicator = document.getElementById('status-indicator');
const fpsIndicator = document.getElementById('fps-indicator');

function init() {
  renderer = new CanvasRenderer(canvasElement);
  audio = new AudioController();
  tracker = new HandTracker(videoElement);

  setupEventListeners();

  tracker.onResults(handleTrackingResults);
  tracker.onError(handleTrackingError);

  requestAnimationFrame(renderLoop);
}

function setupEventListeners() {
  startBtn.addEventListener('click', async () => {
    landingModal.classList.add('hidden');
    await audio.resume();
    
    statusIndicator.textContent = 'Initializing Camera...';
    statusIndicator.className = 'status-tag status-connecting';
    
    try {
      await tracker.start();
      statusIndicator.textContent = 'Tracking Active';
      statusIndicator.className = 'status-tag status-active';
    } catch (e) {}
  });

  retryBtn.addEventListener('click', () => {
    errorOverlay.classList.add('hidden');
    landingModal.classList.remove('hidden');
  });

  clearBtn.addEventListener('click', () => {
    renderer.clear();
  });

  muteBtn.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    if (isMuted) {
      muteBtn.innerHTML = '<span class="icon">🔇</span> Unmute Audio';
      muteBtn.classList.add('control-btn-active');
    } else {
      muteBtn.innerHTML = '<span class="icon">🔊</span> Mute Audio';
      muteBtn.classList.remove('control-btn-active');
    }
  });

  mirrorToggle.addEventListener('click', () => {
    mirrorMode = !mirrorMode;
    mirrorToggle.classList.toggle('control-btn-active', mirrorMode);
    videoElement.style.transform = mirrorMode ? 'scaleX(-1)' : 'scaleX(1)';
  });

  camToggle.addEventListener('click', () => {
    if (webcamOverlayMode === 'visible') {
      webcamOverlayMode = 'semi';
      videoElement.style.opacity = '0.15';
      camToggle.innerHTML = '<span class="icon">📷</span> Overlay: Dim';
    } else if (webcamOverlayMode === 'semi') {
      webcamOverlayMode = 'hidden';
      videoElement.style.opacity = '0';
      camToggle.innerHTML = '<span class="icon">📷</span> Overlay: Off';
    } else {
      webcamOverlayMode = 'visible';
      videoElement.style.opacity = '0.5';
      camToggle.innerHTML = '<span class="icon">📷</span> Overlay: On';
    }
  });

  sizeSlider.addEventListener('input', (e) => {
    const size = parseInt(e.target.value);
    sizeVal.textContent = `${size}px`;
    renderer.setBrushSize(size);
  });

  fadeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    fadeVal.textContent = val === 0 ? 'Infinite' : `${val}s`;
    renderer.setTrailDuration(val);
  });

  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      rainbowBtn.classList.remove('preset-card-active');
      colorSwatches.forEach(s => s.classList.remove('color-swatch-active'));
      swatch.classList.add('color-swatch-active');
      renderer.setBrushColor(swatch.getAttribute('data-rgb'));
    });
  });

  customColorInput.addEventListener('input', (e) => {
    rainbowBtn.classList.remove('preset-card-active');
    colorSwatches.forEach(s => s.classList.remove('color-swatch-active'));
    const hex = e.target.value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    renderer.setBrushColor(`${r}, ${g}, ${b}`);
  });

  rainbowBtn.addEventListener('click', () => {
    colorSwatches.forEach(s => s.classList.remove('color-swatch-active'));
    rainbowBtn.classList.add('preset-card-active');
    renderer.setRainbowMode(true);
  });

  waveBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      waveBtns.forEach(b => b.classList.remove('wave-btn-active'));
      btn.classList.add('wave-btn-active');
      audio.setWaveform(btn.getAttribute('data-wave'));
    });
  });

  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      presetCards.forEach(c => c.classList.remove('preset-card-active'));
      card.classList.add('preset-card-active');
      applyPreset(card.getAttribute('data-preset'));
    });
  });
}

function applyPreset(name) {
  rainbowBtn.classList.remove('preset-card-active');
  colorSwatches.forEach(s => s.classList.remove('color-swatch-active'));

  switch (name) {
    case 'cosmic':
      renderer.setRainbowMode(false);
      renderer.setBrushColor('0, 240, 255');
      document.querySelector('[data-rgb="0, 240, 255"]').classList.add('color-swatch-active');
      renderer.setBrushSize(12);
      sizeSlider.value = 12;
      sizeVal.textContent = '12px';
      renderer.setTrailDuration(2.0);
      fadeSlider.value = 2.0;
      fadeVal.textContent = '2s';
      renderer.inertia = 0.18;
      audio.setWaveform('triangle');
      setActiveWaveformButton('triangle');
      break;

    case 'fire':
      renderer.setRainbowMode(false);
      renderer.setBrushColor('255, 210, 0');
      document.querySelector('[data-rgb="255, 210, 0"]').classList.add('color-swatch-active');
      renderer.setBrushSize(20);
      sizeSlider.value = 20;
      sizeVal.textContent = '20px';
      renderer.setTrailDuration(1.0);
      fadeSlider.value = 1.0;
      fadeVal.textContent = '1s';
      renderer.inertia = 0.12;
      audio.setWaveform('sawtooth');
      setActiveWaveformButton('sawtooth');
      break;

    case 'laser':
      renderer.setRainbowMode(false);
      renderer.setBrushColor('255, 0, 128');
      document.querySelector('[data-rgb="255, 0, 128"]').classList.add('color-swatch-active');
      renderer.setBrushSize(6);
      sizeSlider.value = 6;
      sizeVal.textContent = '6px';
      renderer.setTrailDuration(0);
      fadeSlider.value = 0;
      fadeVal.textContent = 'Infinite';
      renderer.inertia = 0.35;
      audio.setWaveform('sine');
      setActiveWaveformButton('sine');
      break;

    case 'aurora':
      rainbowBtn.classList.add('preset-card-active');
      renderer.setRainbowMode(true);
      renderer.setBrushSize(35);
      sizeSlider.value = 35;
      sizeVal.textContent = '35px';
      renderer.setTrailDuration(4.0);
      fadeSlider.value = 4.0;
      fadeVal.textContent = '4s';
      renderer.inertia = 0.08;
      audio.setWaveform('square');
      setActiveWaveformButton('square');
      break;
  }
}

function setActiveWaveformButton(wave) {
  waveBtns.forEach(b => {
    b.classList.toggle('wave-btn-active', b.getAttribute('data-wave') === wave);
  });
}

function handleTrackingResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    const gesture = detectGesture(landmarks);
    const indexTip = landmarks[8];
    const isDrawing = (gesture === 'draw');
    const isErasing = (gesture === 'erase');
    
    const renderPos = renderer.addPoint(indexTip.x, indexTip.y, isDrawing, mirrorMode);
    
    if (isErasing) {
      renderer.erasePointsNear(renderPos.x, renderPos.y, 45);
    }

    const normX = renderPos.x / canvasElement.width;
    const normY = renderPos.y / canvasElement.height;
    const normSpeed = renderPos.speed / Math.hypot(canvasElement.width, canvasElement.height);

    audio.update(normX, normY, normSpeed, isDrawing || isErasing);
    
    cursorInfo.x = renderPos.x;
    cursorInfo.y = renderPos.y;
    cursorInfo.isDrawing = isDrawing;
    cursorInfo.gesture = gesture;
    cursorInfo.active = true;

    let gestureEmoji = '✋';
    if (gesture === 'draw') gestureEmoji = '☝️ Paint';
    else if (gesture === 'hover') gestureEmoji = '✌️ Hover';
    else if (gesture === 'erase') gestureEmoji = '✊ Erase';
    gestureIndicator.textContent = gestureEmoji;
  } else {
    renderer.breakStroke();
    audio.update(0, 0, 0, false);
    cursorInfo.active = false;
    gestureIndicator.textContent = 'No Hand';
  }
}

function handleTrackingError(error) {
  console.error(error);
  statusIndicator.textContent = 'Tracking Offline';
  statusIndicator.className = 'status-tag status-inactive';
  errorMessage.textContent = error.message || 'Webcam access failed.';
  errorOverlay.classList.remove('hidden');
}

function renderLoop(timestamp) {
  frameCount++;
  if (timestamp > lastFpsUpdate + 1000) {
    fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
    fpsIndicator.textContent = `${fps} FPS`;
    frameCount = 0;
    lastFpsUpdate = timestamp;
  }

  renderer.render(cursorInfo);
  requestAnimationFrame(renderLoop);
}

window.addEventListener('DOMContentLoaded', init);
