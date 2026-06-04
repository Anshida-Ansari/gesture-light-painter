export class HandTracker {
  constructor(videoElement) {
    this.video = videoElement;
    this.hands = null;
    this.stream = null;
    this.initialized = false;
    this.isProcessing = false;
    this.onResultsCallback = null;
    this.onErrorCallback = null;
  }

  async start() {
    try {
      // Secure Context check
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Webcam API is unavailable. Please verify that this page is loaded over ' +
          'a secure connection (localhost or HTTPS).'
        );
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.video.srcObject = this.stream;
      
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => resolve();
      });
      await this.video.play();

      await this.initMediaPipe();

      this.initialized = true;
      this.startLoop();

      return this.stream;
    } catch (err) {
      if (this.onErrorCallback) {
        this.onErrorCallback(err);
      }
      throw err;
    }
  }

  async initMediaPipe() {
    if (typeof window.Hands === 'undefined') {
      throw new Error('MediaPipe Hands CDN scripts not loaded.');
    }

    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0, // 0 is Lite model
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
    });

    this.hands.onResults((results) => {
      if (this.initialized && this.onResultsCallback) {
        this.onResultsCallback(results);
      }
    });
  }

  // Analyzes webcam frames sequentially to avoid processing overlap
  startLoop() {
    const processFrame = async () => {
      if (!this.initialized) return;

      if (this.video.readyState >= 2 && !this.isProcessing) {
        this.isProcessing = true;
        try {
          await this.hands.send({ image: this.video });
        } catch (e) {
          console.error(e);
        }
        this.isProcessing = false;
      }
      requestAnimationFrame(processFrame);
    };

    requestAnimationFrame(processFrame);
  }

  onResults(cb) {
    this.onResultsCallback = cb;
  }

  onError(cb) {
    this.onErrorCallback = cb;
  }

  stop() {
    this.initialized = false;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video.pause();
    }
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
  }
}