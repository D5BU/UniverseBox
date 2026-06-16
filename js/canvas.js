/**
 * Manages drawing of the physical particles, fields, and dragging indicators
 */
export class CanvasManager {
  constructor(canvasId, engine) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.engine = engine;

    this.showTrails = true;
    this.showVectorField = false;

    // Grid spacing for Vector Field
    this.gridSpacing = 40;

    // Resizing binds
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  clear() {
    // Standard clear or trails fade effect
    // We clear the canvas completely each frame
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Background Space Grid (Slight visual texture)
    this.drawSpaceGrid();
  }

  drawSpaceGrid() {
    const spacing = 80;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    // Vertical lines
    for (let x = 0; x < this.canvas.width; x += spacing) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }
    // Horizontal lines
    for (let y = 0; y < this.canvas.height; y += spacing) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }
    this.ctx.stroke();
  }

  draw(spawnPreview = null) {
    this.clear();

    // 1. Draw Vector Force Field (Background level)
    if (this.showVectorField) {
      this.drawVectorField();
    }

    // 2. Draw Trails (Mid level)
    if (this.showTrails) {
      this.drawTrails();
    }

    // 3. Draw Particles (Top level)
    this.drawParticles();

    // 4. Draw Launch Spawner Preview (Overlay level)
    if (spawnPreview) {
      this.drawSpawnPreview(spawnPreview);
    }
  }

  drawTrails() {
    const particles = this.engine.particles;
    
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.isBlackHole) continue; // Black holes don't need trails in this style

      const trail = p.trail;
      if (trail.length < 2) continue;

      this.ctx.lineWidth = p.radius * 0.4;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      // Draw fading trail segments
      for (let j = 1; j < trail.length; j++) {
        const ratio = j / trail.length;
        this.ctx.beginPath();
        this.ctx.moveTo(trail[j - 1].x, trail[j - 1].y);
        this.ctx.lineTo(trail[j].x, trail[j].y);
        
        // Convert hex color to RGBA and fade older segments
        this.ctx.strokeStyle = this.hexToRGBA(p.color, ratio * 0.25);
        this.ctx.stroke();
      }
    }
  }

  drawParticles() {
    const particles = this.engine.particles;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (p.isBlackHole) {
        this.drawBlackHole(p);
      } else {
        this.drawStandardParticle(p);
      }
    }
  }

  drawStandardParticle(p) {
    const ctx = this.ctx;
    
    // Outer Glow
    ctx.shadowBlur = p.radius * 1.5;
    ctx.shadowColor = p.color;
    
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    
    // Core highlight (gives it a 3D glass bead look)
    ctx.shadowBlur = 0; // reset for core overlay
    
    ctx.beginPath();
    ctx.arc(p.pos.x - p.radius * 0.25, p.pos.y - p.radius * 0.25, p.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();

    // Draw Charge Signs (+ / -)
    if (p.charge !== 0 && p.radius >= 6) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = `bold ${Math.floor(p.radius * 1.1)}px var(--font-main)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const symbol = p.charge > 0 ? '+' : '-';
      ctx.fillText(symbol, p.pos.x, p.pos.y);
    }
  }

  drawBlackHole(p) {
    const ctx = this.ctx;
    p.pulseAge += 0.02; // Rotate accretion disk

    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);

    // 1. Glowing outer gravitational lensing halo
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 2.8, 0, Math.PI * 2);
    const radGrad = ctx.createRadialGradient(0, 0, p.radius, 0, 0, p.radius * 2.8);
    radGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    radGrad.addColorStop(0.2, 'rgba(157, 78, 221, 0.3)');
    radGrad.addColorStop(0.6, 'rgba(0, 242, 254, 0.1)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.fill();

    // 2. Swirling Accretion Disk (Neon orange and violet arcs)
    ctx.rotate(p.pulseAge);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Primary Accretion loop
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 1.5, 0, Math.PI * 1.4);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)'; // Amber
    ctx.stroke();

    // Secondary Accretion loop (opposite spin, offset)
    ctx.rotate(-p.pulseAge * 2.2);
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 1.9, 0, Math.PI * 1.1);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)'; // Pink/Purple
    ctx.stroke();

    ctx.restore();

    // 3. Central Event Horizon (Pitch Black Sphere)
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#9d4edd';
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#020205';
    ctx.fill();
    ctx.shadowBlur = 0; // reset
  }

  drawVectorField() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Draw vector arrows at grid nodes
    for (let x = this.gridSpacing / 2; x < w; x += this.gridSpacing) {
      for (let y = this.gridSpacing / 2; y < h; y += this.gridSpacing) {
        const force = this.engine.getNetForceAt(x, y);
        const fMag = force.mag();
        
        if (fMag < 0.001) continue;

        // Vector direction
        const angle = force.heading();
        
        // Logarithmic scale for length representation so high fields don't dominate
        const maxLen = this.gridSpacing * 0.7;
        const len = Math.min(maxLen, Math.log(1 + fMag * 100) * 2.8);
        
        if (len < 1) continue;

        // Color based on force intensity (blue/cyan for soft, pink/red for intense)
        const intensity = Math.min(1.0, fMag * 20); // Scale multiplier
        const hue = 200 + (100 * intensity); // Shift from cyan to purple/pink
        const alpha = Math.min(0.5, 0.05 + intensity * 0.45);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
        ctx.lineWidth = 1.2;
        
        // Draw field arrow/pointer line
        ctx.beginPath();
        ctx.moveTo(-len / 2, 0);
        ctx.lineTo(len / 2, 0);
        // Arrow head
        ctx.lineTo(len / 2 - 3, -2);
        ctx.moveTo(len / 2, 0);
        ctx.lineTo(len / 2 - 3, 2);
        ctx.stroke();
        
        ctx.restore();
      }
    }
  }

  drawSpawnPreview(preview) {
    const ctx = this.ctx;
    const { startX, startY, currentX, currentY, mass, charge, radius, color, fixed, isBlackHole } = preview;

    // Draw Vector Launch Arrow
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]); // Dotted line
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Draw Arrowhead pointing from start to current drag
    const dx = currentX - startX;
    const dy = currentY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      const angle = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(currentX, currentY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fill();
      ctx.restore();
    }

    // Draw Particle Spawning Preview Sphere
    ctx.save();
    if (isBlackHole) {
      // Swirling outer helper
      ctx.beginPath();
      ctx.arc(startX, startY, radius * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#080811';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#9d4edd';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRGBA(color, 0.6);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Show charge icon preview
      if (charge !== 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(radius * 1.1)}px var(--font-main)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(charge > 0 ? '+' : '-', startX, startY);
      }
    }
    ctx.restore();
  }

  /**
   * Helper utility for fading hex color strings
   */
  hexToRGBA(hex, alpha) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    if (!result) return `rgba(255, 255, 255, ${alpha})`;

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
