import { lerp, distance } from './utils.js';

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.brushColor = 'rgb(0, 240, 255)';
    this.brushColorRgb = '0, 240, 255';
    this.brushSize = 12;
    this.decayRate = 0.005;
    this.rainbowMode = false;
    this.rainbowHue = 0;

    // Follow physics inertia
    this.lastX = null;
    this.lastY = null;
    this.smoothX = null;
    this.smoothY = null;
    this.inertia = 0.18;

    this.strokes = [];
    this.currentStroke = null;
    this.particles = [];
    this.maxParticles = 400;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setBrushColor(rgbStr) {
    this.rainbowMode = false;
    this.brushColorRgb = rgbStr;
    this.brushColor = `rgb(${rgbStr})`;
  }

  setRainbowMode(enabled) {
    this.rainbowMode = enabled;
  }

  setBrushSize(size) {
    this.brushSize = size;
  }

  setTrailDuration(value) {
    if (value === 0) {
      this.decayRate = 0;
    } else {
      this.decayRate = 1 / (value * 60);
    }
  }

  clear() {
    this.strokes = [];
    this.currentStroke = null;
    this.particles = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Smooths raw coordinates using linear interpolation to simulate a fluid drag lag
  addPoint(rawX, rawY, isDrawing, mirror = true) {
    let targetX = (mirror ? (1 - rawX) : rawX) * this.canvas.width;
    let targetY = rawY * this.canvas.height;

    if (this.smoothX === null || this.smoothY === null) {
      this.smoothX = targetX;
      this.smoothY = targetY;
    }

    this.smoothX = lerp(this.smoothX, targetX, this.inertia);
    this.smoothY = lerp(this.smoothY, targetY, this.inertia);

    const currentPos = { x: this.smoothX, y: this.smoothY };
    const prevPos = { x: this.lastX ?? this.smoothX, y: this.lastY ?? this.smoothY };
    const speed = distance(currentPos, prevPos);

    if (this.rainbowMode) {
      this.rainbowHue = (this.rainbowHue + 1) % 360;
      this.brushColor = `hsl(${this.rainbowHue}, 100%, 55%)`;
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.fillStyle = this.brushColor;
      tempCtx.fillRect(0,0,1,1);
      const data = tempCtx.getImageData(0,0,1,1).data;
      this.brushColorRgb = `${data[0]}, ${data[1]}, ${data[2]}`;
    }

    if (isDrawing) {
      if (!this.currentStroke) {
        this.currentStroke = {
          points: [],
          colorRgb: this.brushColorRgb,
          size: this.brushSize
        };
        this.strokes.push(this.currentStroke);
      }

      this.currentStroke.points.push({
        x: this.smoothX,
        y: this.smoothY,
        alpha: 1.0
      });

      this.emitParticles(this.smoothX, this.smoothY, speed);
    } else {
      this.currentStroke = null;
    }

    this.lastX = this.smoothX;
    this.lastY = this.smoothY;

    return { x: this.smoothX, y: this.smoothY, speed };
  }

  breakStroke() {
    this.currentStroke = null;
    this.lastX = null;
    this.lastY = null;
    this.smoothX = null;
    this.smoothY = null;
  }

  // Delete line points close to the coordinates
  erasePointsNear(x, y, radius) {
    this.strokes.forEach(stroke => {
      stroke.points = stroke.points.filter(p => {
        const d = distance(p, { x, y });
        return d > radius;
      });
    });
    this.strokes = this.strokes.filter(s => s.points.length > 0);

    const count = 3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 15,
        y: y + (Math.random() - 0.5) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        colorRgb: '100, 100, 100',
        size: Math.random() * 2 + 1,
        alpha: 0.8,
        decay: 0.03
      });
    }
  }

  emitParticles(x, y, speed) {
    const count = Math.min(Math.floor(speed * 0.4) + 1, 8);
    
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const velocity = (Math.random() * 3 + 1) * (1 + speed * 0.05);

      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 0.5,
        colorRgb: this.brushColorRgb,
        size: Math.random() * 3 + 1.5,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015
      });
    }
  }

  drawCursor(x, y, isDrawing, gesture) {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    
    const color = isDrawing ? `rgba(${this.brushColorRgb}, 0.9)` : 'rgba(255, 255, 255, 0.4)';
    const outerRadius = isDrawing ? this.brushSize + 10 : 15;
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    if (!isDrawing) {
      this.ctx.setLineDash([4, 4]);
    }
    this.ctx.stroke();

    this.ctx.fillStyle = color;
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(gesture.toUpperCase(), x, y - outerRadius - 5);
    
    this.ctx.restore();
  }

  render(cursorInfo = null) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.decayRate > 0) {
      this.strokes.forEach(stroke => {
        stroke.points.forEach(p => {
          p.alpha -= this.decayRate;
        });
        stroke.points = stroke.points.filter(p => p.alpha > 0.01);
      });
      this.strokes = this.strokes.filter(s => s.points.length > 0);
    }

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.vx *= 0.98;
      p.alpha -= p.decay;
    });
    this.particles = this.particles.filter(p => p.alpha > 0);

    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Glow Pass 1: Ambient soft backing glow
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.filter = 'blur(16px)';
    this.drawStrokes(1.0, (rgb, size, alpha) => {
      this.ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.25})`;
      this.ctx.lineWidth = size * 3.5;
    });

    // Glow Pass 2: Medium inner core glow
    this.ctx.filter = 'blur(3px)';
    this.drawStrokes(1.0, (rgb, size, alpha) => {
      this.ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.75})`;
      this.ctx.lineWidth = size * 1.3;
    });

    // Glow Pass 3: Crisp white core line
    this.ctx.filter = 'none';
    this.drawStrokes(1.0, (rgb, size, alpha) => {
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      this.ctx.lineWidth = size * 0.35;
    });

    this.ctx.restore();

    // Render particles
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${p.colorRgb}, ${p.alpha})`;
      this.ctx.fill();
    });
    this.ctx.restore();

    if (cursorInfo && cursorInfo.active) {
      this.drawCursor(cursorInfo.x, cursorInfo.y, cursorInfo.isDrawing, cursorInfo.gesture);
    }
  }

  // Draw smooth curves using quadratic curves between midpoints of coordinates
  drawStrokes(strokeScale, setStyleCallback) {
    this.strokes.forEach(stroke => {
      const pts = stroke.points;
      if (pts.length < 2) return;

      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const avgAlpha = (p1.alpha + p2.alpha) / 2;
        if (avgAlpha <= 0) continue;

        this.ctx.beginPath();
        
        const startX = i === 0 ? p1.x : (pts[i - 1].x + p1.x) / 2;
        const startY = i === 0 ? p1.y : (pts[i - 1].y + p1.y) / 2;
        const endX = (p1.x + p2.x) / 2;
        const endY = (p1.y + p2.y) / 2;

        this.ctx.moveTo(startX, startY);
        this.ctx.quadraticCurveTo(p1.x, p1.y, endX, endY);
        
        setStyleCallback(stroke.colorRgb, stroke.size, avgAlpha);
        this.ctx.stroke();
      }
    });
  }
}
