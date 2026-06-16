import { Particle, Vector2D } from './engine.js';

export class UIManager {
  constructor(engine, canvasManager) {
    this.engine = engine;
    this.canvasManager = canvasManager;
    
    this.isPaused = false;
    this.activeSpawnPreset = 'proton';

    // Chart parameters
    this.chartCanvas = document.getElementById('energy-chart');
    this.chartCtx = this.chartCanvas.getContext('2d');
    this.energyHistory = [];
    this.maxHistoryPoints = 180;

    this.initElements();
    this.bindEvents();
    
    // Set default spawn preset values on load
    this.selectSpawnPreset('proton');
    
    // Resize chart canvas
    this.resizeChartCanvas();
  }

  resizeChartCanvas() {
    this.chartCanvas.width = this.chartCanvas.parentElement.clientWidth;
    this.chartCanvas.height = this.chartCanvas.parentElement.clientHeight;
  }

  initElements() {
    // Buttons
    this.btnPlayPause = document.getElementById('btn-play-pause');
    this.btnStep = document.getElementById('btn-step');
    this.btnClear = document.getElementById('btn-clear');
    
    // Panel Toggles
    this.btnToggleLeft = document.getElementById('btn-toggle-left');
    this.btnToggleRight = document.getElementById('btn-toggle-right');
    this.controlPanel = document.getElementById('control-panel');
    this.inspectorPanel = document.getElementById('inspector-panel');
    
    // Selects
    this.presetSelect = document.getElementById('preset-select');
    
    // Sliders
    this.slideGravity = document.getElementById('slide-gravity');
    this.slideCoulomb = document.getElementById('slide-coulomb');
    this.slideElasticity = document.getElementById('slide-elasticity');
    this.slideDrag = document.getElementById('slide-drag');
    this.slideTimestep = document.getElementById('slide-timestep');
    
    // Slider Value Outputs
    this.valGravity = document.getElementById('val-gravity');
    this.valCoulomb = document.getElementById('val-coulomb');
    this.valElasticity = document.getElementById('val-elasticity');
    this.valDrag = document.getElementById('val-drag');
    this.valTimestep = document.getElementById('val-timestep');
    
    // Checkboxes
    this.chkBoundaryBounce = document.getElementById('chk-boundary-bounce');
    this.chkShowTrails = document.getElementById('chk-show-trails');
    this.chkShowVectors = document.getElementById('chk-show-vectors');
    this.chkSoftCollisions = document.getElementById('chk-soft-collisions');

    // Spawner Elements
    this.btnSpawnProton = document.getElementById('spawn-preset-proton');
    this.btnSpawnElectron = document.getElementById('spawn-preset-electron');
    this.btnSpawnNeutron = document.getElementById('spawn-preset-neutron');
    this.btnSpawnBlackHole = document.getElementById('spawn-preset-blackhole');
    
    this.slideSpawnMass = document.getElementById('slide-spawn-mass');
    this.slideSpawnCharge = document.getElementById('slide-spawn-charge');
    this.slideSpawnRadius = document.getElementById('slide-spawn-radius');
    this.valSpawnMass = document.getElementById('val-spawn-mass');
    this.valSpawnCharge = document.getElementById('val-spawn-charge');
    this.valSpawnRadius = document.getElementById('val-spawn-radius');
    this.spawnColor = document.getElementById('spawn-color');
    this.chkSpawnFixed = document.getElementById('chk-spawn-fixed');

    // Stats
    this.statFps = document.getElementById('stat-fps');
    this.statCount = document.getElementById('stat-count');
    this.statKe = document.getElementById('stat-ke');
    this.statPe = document.getElementById('stat-pe');
    this.statTe = document.getElementById('stat-te');
  }

  bindEvents() {
    // 1. Playback Controls
    this.btnPlayPause.addEventListener('click', () => this.togglePause());
    this.btnStep.addEventListener('click', () => this.triggerStep());
    this.btnClear.addEventListener('click', () => {
      this.engine.clear();
      this.energyHistory = [];
    });

    // 1.5. Sidebar Panel Toggles
    this.btnToggleLeft.addEventListener('click', () => {
      const isCollapsed = this.controlPanel.classList.toggle('collapsed');
      this.btnToggleLeft.textContent = isCollapsed ? '▶' : '◀';
    });

    this.btnToggleRight.addEventListener('click', () => {
      const isCollapsed = this.inspectorPanel.classList.toggle('collapsed');
      this.btnToggleRight.textContent = isCollapsed ? '◀' : '▶';
    });

    // 2. Constants Sliders (Direct bindings to engine parameters)
    this.slideGravity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.engine.gravityConstant = val;
      this.valGravity.textContent = val.toFixed(1);
    });

    this.slideCoulomb.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.engine.coulombConstant = val;
      this.valCoulomb.textContent = val.toFixed(1);
    });

    this.slideElasticity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.engine.restitution = val;
      this.valElasticity.textContent = val.toFixed(2);
    });

    this.slideDrag.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.engine.drag = val;
      this.valDrag.textContent = val.toFixed(3);
    });

    this.slideTimestep.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.valTimestep.textContent = val.toFixed(1);
    });

    // 3. Rules & Render Checkboxes
    this.chkBoundaryBounce.addEventListener('change', (e) => {
      this.engine.boundaryBounce = e.target.checked;
    });

    this.chkSoftCollisions.addEventListener('change', (e) => {
      this.engine.softCollisions = e.target.checked;
    });

    this.chkShowTrails.addEventListener('change', (e) => {
      this.canvasManager.showTrails = e.target.checked;
    });

    this.chkShowVectors.addEventListener('change', (e) => {
      this.canvasManager.showVectorField = e.target.checked;
    });

    // 4. Particle Spawner Preset Switches
    this.btnSpawnProton.addEventListener('click', () => this.selectSpawnPreset('proton'));
    this.btnSpawnElectron.addEventListener('click', () => this.selectSpawnPreset('electron'));
    this.btnSpawnNeutron.addEventListener('click', () => this.selectSpawnPreset('neutron'));
    this.btnSpawnBlackHole.addEventListener('click', () => this.selectSpawnPreset('blackhole'));

    // Manual Override Spawner Sliders
    this.slideSpawnMass.addEventListener('input', (e) => {
      this.valSpawnMass.textContent = parseFloat(e.target.value).toFixed(1);
    });
    this.slideSpawnCharge.addEventListener('input', (e) => {
      this.valSpawnCharge.textContent = parseFloat(e.target.value).toFixed(1);
    });
    this.slideSpawnRadius.addEventListener('input', (e) => {
      this.valSpawnRadius.textContent = parseInt(e.target.value);
    });

    // 5. Presets Dropdown
    this.presetSelect.addEventListener('change', (e) => {
      this.loadSimulationPreset(e.target.value);
    });

    // Resize binding for energy chart
    window.addEventListener('resize', () => this.resizeChartCanvas());
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.btnPlayPause.innerHTML = '<span class="icon">▶</span> Play';
      this.btnPlayPause.classList.remove('primary');
      this.btnPlayPause.classList.add('secondary');
    } else {
      this.btnPlayPause.innerHTML = '<span class="icon">⏸</span> Pause';
      this.btnPlayPause.classList.remove('secondary');
      this.btnPlayPause.classList.add('primary');
    }
  }

  triggerStep() {
    if (!this.isPaused) this.togglePause();
    const dt = parseFloat(this.slideTimestep.value);
    this.engine.step(dt);
  }

  selectSpawnPreset(preset) {
    this.activeSpawnPreset = preset;
    
    // Reset active buttons class
    const buttons = [this.btnSpawnProton, this.btnSpawnElectron, this.btnSpawnNeutron, this.btnSpawnBlackHole];
    buttons.forEach(btn => btn.classList.remove('active'));

    switch (preset) {
      case 'proton':
        this.btnSpawnProton.classList.add('active');
        this.setSpawnerValues(10.0, 1.0, 8, '#ff3e3e', false);
        break;
      case 'electron':
        this.btnSpawnElectron.classList.add('active');
        this.setSpawnerValues(0.5, -1.0, 5, '#3b82f6', false);
        break;
      case 'neutron':
        this.btnSpawnNeutron.classList.add('active');
        this.setSpawnerValues(10.0, 0.0, 8, '#94a3b8', false);
        break;
      case 'blackhole':
        this.btnSpawnBlackHole.classList.add('active');
        this.setSpawnerValues(5000.0, 0.0, 20, '#000000', true);
        break;
    }
  }

  setSpawnerValues(mass, charge, radius, color, fixed) {
    this.slideSpawnMass.value = mass;
    this.valSpawnMass.textContent = mass.toFixed(1);
    
    this.slideSpawnCharge.value = charge;
    this.valSpawnCharge.textContent = charge.toFixed(1);
    
    this.slideSpawnRadius.value = radius;
    this.valSpawnRadius.textContent = radius;
    
    this.spawnColor.value = color;
    this.chkSpawnFixed.checked = fixed;
  }

  getSpawnerConfig() {
    return {
      mass: parseFloat(this.slideSpawnMass.value),
      charge: parseFloat(this.slideSpawnCharge.value),
      radius: parseInt(this.slideSpawnRadius.value),
      color: this.spawnColor.value,
      fixed: this.chkSpawnFixed.checked,
      isBlackHole: this.activeSpawnPreset === 'blackhole'
    };
  }

  /**
   * Load Simulation Presets
   */
  loadSimulationPreset(presetName) {
    this.engine.clear();
    this.energyHistory = [];
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Reset camera state on preset load
    if (this.canvasManager && this.canvasManager.camera) {
      this.canvasManager.camera.x = w / 2;
      this.canvasManager.camera.y = h / 2;
      this.canvasManager.camera.zoom = 1.0;
    }

    const center = new Vector2D(w / 2, h / 2);

    switch (presetName) {
      case 'solar-system':
        // Center Star
        this.engine.addParticle(new Particle({
          x: center.x,
          y: center.y,
          vx: 0,
          vy: 0,
          mass: 12000,
          charge: 0,
          radius: 24,
          color: '#eab308',
          fixed: true
        }));

        // Planet 1 (Inner, Hot)
        this.addOrbitingPlanet(center, 140, 15, 6, '#ef4444', 12000, true);
        // Planet 2 (Habitable with a moon!)
        this.addOrbitingPlanet(center, 240, 35, 9, '#10b981', 12000, true);
        // Moon orbiting Planet 2
        const p2OrbitSpeed = Math.sqrt((1.0 * 12000) / 240);
        const p2VelY = -p2OrbitSpeed;
        const moonOrbitSpeed = Math.sqrt((1.0 * 35) / 20); // orbit around planet 2 (mass 35) at dist 20
        this.engine.addParticle(new Particle({
          x: center.x,
          y: center.y - 240 - 20,
          vx: -p2VelY - moonOrbitSpeed,
          vy: 0,
          mass: 0.1,
          charge: 0,
          radius: 3,
          color: '#f8fafc',
          fixed: false
        }));

        // Planet 3 (Gas Giant, Outer)
        this.addOrbitingPlanet(center, 350, 80, 14, '#a855f7', 12000, true);
        break;

      case 'galaxy-collision':
        // Core 1 (Cyan Galaxy)
        const g1Center = new Vector2D(center.x - 250, center.y - 80);
        const g1Vel = new Vector2D(1.2, 0.5);
        this.engine.addParticle(new Particle({
          x: g1Center.x,
          y: g1Center.y,
          vx: g1Vel.x,
          vy: g1Vel.y,
          mass: 5000,
          radius: 14,
          color: '#00f2fe',
          fixed: false
        }));
        this.generateGalaxyOrbits(g1Center, g1Vel, 5000, '#00f2fe', 16, true);

        // Core 2 (Pink Galaxy)
        const g2Center = new Vector2D(center.x + 250, center.y + 80);
        const g2Vel = new Vector2D(-1.2, -0.5);
        this.engine.addParticle(new Particle({
          x: g2Center.x,
          y: g2Center.y,
          vx: g2Vel.x,
          vy: g2Vel.y,
          mass: 5000,
          radius: 14,
          color: '#ec4899',
          fixed: false
        }));
        // Orbit opposite direction
        this.generateGalaxyOrbits(g2Center, g2Vel, 5000, '#ec4899', 16, false);
        break;

      case 'three-body':
        // Chaotic equal mass system (orbits calculated for beautiful close interactions)
        this.engine.addParticle(new Particle({
          x: center.x - 140,
          y: center.y,
          vx: 0,
          vy: 3.8,
          mass: 4000,
          radius: 11,
          color: '#ef4444',
          fixed: false
        }));

        this.engine.addParticle(new Particle({
          x: center.x + 140,
          y: center.y,
          vx: 0,
          vy: -3.8,
          mass: 4000,
          radius: 11,
          color: '#3b82f6',
          fixed: false
        }));

        this.engine.addParticle(new Particle({
          x: center.x,
          y: center.y - 120,
          vx: 1.4,
          vy: -0.5,
          mass: 4000,
          radius: 11,
          color: '#10b981',
          fixed: false
        }));
        break;

      case 'electrostatic-trap':
        // Fixed quadrupole configuration
        const dOffset = 130;
        // Top-Left Positive
        this.engine.addParticle(new Particle({
          x: center.x - dOffset, y: center.y - dOffset, mass: 200, charge: 8.0, radius: 12, color: '#ef4444', fixed: true
        }));
        // Bottom-Right Positive
        this.engine.addParticle(new Particle({
          x: center.x + dOffset, y: center.y + dOffset, mass: 200, charge: 8.0, radius: 12, color: '#ef4444', fixed: true
        }));
        // Top-Right Negative
        this.engine.addParticle(new Particle({
          x: center.x + dOffset, y: center.y - dOffset, mass: 200, charge: -8.0, radius: 12, color: '#3b82f6', fixed: true
        }));
        // Bottom-Left Negative
        this.engine.addParticle(new Particle({
          x: center.x - dOffset, y: center.y + dOffset, mass: 200, charge: -8.0, radius: 12, color: '#3b82f6', fixed: true
        }));

        // Dynamic trapped electrons & protons
        for (let i = 0; i < 8; i++) {
          const isProton = Math.random() > 0.5;
          const theta = Math.random() * Math.PI * 2;
          const rad = 40 + Math.random() * 50;
          this.engine.addParticle(new Particle({
            x: center.x + Math.cos(theta) * rad,
            y: center.y + Math.sin(theta) * rad,
            vx: (Math.random() - 0.5) * 4.0,
            vy: (Math.random() - 0.5) * 4.0,
            mass: isProton ? 8 : 1,
            charge: isProton ? 1.5 : -1.5,
            radius: isProton ? 6 : 4,
            color: isProton ? '#fca5a5' : '#93c5fd',
            fixed: false
          }));
        }
        break;

      case 'binary-black-holes':
        // Two massive orbiting black holes
        this.engine.addParticle(new Particle({
          x: center.x - 120,
          y: center.y,
          vx: 0,
          vy: 4.8,
          mass: 8000,
          radius: 20,
          color: '#000000',
          fixed: false,
          isBlackHole: true
        }));

        this.engine.addParticle(new Particle({
          x: center.x + 120,
          y: center.y,
          vx: 0,
          vy: -4.8,
          mass: 8000,
          radius: 20,
          color: '#000000',
          fixed: false,
          isBlackHole: true
        }));

        // Belt of light neutral debris particles destined to be consumed
        for (let i = 0; i < 45; i++) {
          const theta = Math.random() * Math.PI * 2;
          const rad = 150 + Math.random() * 180;
          // Orbital velocity approximation around center mass (16000)
          const orbSpeed = Math.sqrt((1.0 * 16000) / rad) * (0.8 + Math.random() * 0.4);
          
          this.engine.addParticle(new Particle({
            x: center.x + Math.cos(theta) * rad,
            y: center.y + Math.sin(theta) * rad,
            vx: -Math.sin(theta) * orbSpeed,
            vy: Math.cos(theta) * orbSpeed,
            mass: 0.8,
            radius: 2.5,
            color: '#cbd5e1',
            fixed: false
          }));
        }
        break;
    }
  }

  addOrbitingPlanet(center, orbitRadius, mass, radius, color, centerMass, clockwise) {
    const orbitSpeed = Math.sqrt((1.0 * centerMass) / orbitRadius);
    const vx = 0;
    const vy = clockwise ? -orbitSpeed : orbitSpeed;
    
    this.engine.addParticle(new Particle({
      x: center.x + orbitRadius,
      y: center.y,
      vx: vx,
      vy: vy,
      mass: mass,
      charge: 0,
      radius: radius,
      color: color,
      fixed: false
    }));
  }

  generateGalaxyOrbits(corePos, coreVel, coreMass, color, count, clockwise) {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      // Distribute distances
      const r = 50 + Math.random() * 120;
      const orbSpeed = Math.sqrt((1.0 * coreMass) / r);

      const vxRel = clockwise ? -Math.sin(theta) * orbSpeed : Math.sin(theta) * orbSpeed;
      const vyRel = clockwise ? Math.cos(theta) * orbSpeed : -Math.cos(theta) * orbSpeed;

      this.engine.addParticle(new Particle({
        x: corePos.x + Math.cos(theta) * r,
        y: corePos.y + Math.sin(theta) * r,
        vx: coreVel.x + vxRel,
        vy: coreVel.y + vyRel,
        mass: 0.5 + Math.random() * 0.5,
        radius: 3,
        color: color,
        fixed: false
      }));
    }
  }

  /**
   * Diagnostic Loop: updates text counters and renders energy chart
   */
  updateDiagnostics(fps) {
    // 1. Text diagnostics
    this.statFps.textContent = fps;
    this.statCount.textContent = this.engine.particles.length;

    const energy = this.engine.calculateTotalEnergy();
    this.statKe.textContent = Math.round(energy.ke).toLocaleString();
    this.statPe.textContent = Math.round(energy.pe).toLocaleString();
    this.statTe.textContent = Math.round(energy.te).toLocaleString();

    // 2. Add to rolling history
    this.energyHistory.push({
      ke: energy.ke,
      pe: energy.pe,
      te: energy.te
    });

    if (this.energyHistory.length > this.maxHistoryPoints) {
      this.energyHistory.shift();
    }

    // 3. Draw energy chart
    this.drawEnergyChart();
  }

  drawEnergyChart() {
    const ctx = this.chartCtx;
    const w = this.chartCanvas.width;
    const h = this.chartCanvas.height;
    
    ctx.clearRect(0, 0, w, h);

    if (this.energyHistory.length < 2) return;

    // Find limits for dynamic Y-scaling
    let max = -Infinity;
    let min = Infinity;

    for (let i = 0; i < this.energyHistory.length; i++) {
      const pt = this.energyHistory[i];
      max = Math.max(max, pt.ke, pt.pe, pt.te);
      min = Math.min(min, pt.ke, pt.pe, pt.te);
    }

    // Safe padding
    let range = max - min;
    if (range < 1) range = 100;
    max += range * 0.1;
    min -= range * 0.1;

    // Helper map function to screen coordinates
    const mapY = (val) => {
      const pct = (val - min) / (max - min);
      return h - 6 - pct * (h - 12);
    };

    const mapX = (idx) => {
      return (idx / (this.maxHistoryPoints - 1)) * w;
    };

    // Draw zero reference line if visible
    if (min < 0 && max > 0) {
      const zeroY = mapY(0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(w, zeroY);
      ctx.stroke();
    }

    // Plot Paths
    this.plotEnergyPath('ke', '#10b981'); // Emerald
    this.plotEnergyPath('pe', '#f59e0b'); // Amber
    this.plotEnergyPath('te', '#00f2fe'); // Cyan
  }

  plotEnergyPath(key, strokeStyle) {
    const ctx = this.chartCtx;
    const w = this.chartCanvas.width;
    const h = this.chartCanvas.height;

    let max = -Infinity;
    let min = Infinity;
    for (let i = 0; i < this.energyHistory.length; i++) {
      const pt = this.energyHistory[i];
      max = Math.max(max, pt.ke, pt.pe, pt.te);
      min = Math.min(min, pt.ke, pt.pe, pt.te);
    }
    let range = max - min;
    if (range < 1) range = 100;
    max += range * 0.1;
    min -= range * 0.1;

    const mapY = (val) => h - 6 - ((val - min) / (max - min)) * (h - 12);
    const mapX = (idx) => (idx / (this.maxHistoryPoints - 1)) * w;

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = key === 'te' ? 2 : 1.2;
    ctx.beginPath();
    
    // Start drawing from correct offset
    const offset = this.maxHistoryPoints - this.energyHistory.length;
    ctx.moveTo(mapX(offset), mapY(this.energyHistory[0][key]));

    for (let i = 1; i < this.energyHistory.length; i++) {
      ctx.lineTo(mapX(offset + i), mapY(this.energyHistory[i][key]));
    }
    ctx.stroke();
  }
}
