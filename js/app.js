import { PhysicsEngine, Particle } from './engine.js';
import { CanvasManager } from './canvas.js';
import { UIManager } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Core Engines
  const engine = new PhysicsEngine();
  const canvasManager = new CanvasManager('physics-canvas', engine);
  const ui = new UIManager(engine, canvasManager);

  // 2. Drag & Drop Launcher State
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragCurrent = { x: 0, y: 0 };
  const velocityScale = 0.08; // Adjusts drag-to-velocity magnitude

  // Camera Pan State
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let camStart = { x: 0, y: 0 };

  // 3. Mouse Event Listeners for Particle Creation
  const canvas = canvasManager.canvas;

  canvas.addEventListener('mousedown', (e) => {
    // Block clicks when landing page is active
    const landingPage = document.getElementById('landing-page');
    if (landingPage && !landingPage.classList.contains('hidden-landing')) return;

    // Check if middle-click (button 1) OR Shift + Left-click
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      isPanning = true;
      panStart.x = e.clientX;
      panStart.y = e.clientY;
      camStart.x = canvasManager.camera.x;
      camStart.y = canvasManager.camera.y;
      e.preventDefault();
      return;
    }

    // Only handle left clicks (button 0) for dragging launcher
    if (e.button !== 0) return;
    
    isDragging = true;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    dragCurrent.x = e.clientX;
    dragCurrent.y = e.clientY;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      // Adjust camera focus inversely to pan dragging
      canvasManager.camera.x = camStart.x - dx / canvasManager.camera.zoom;
      canvasManager.camera.y = camStart.y - dy / canvasManager.camera.zoom;
      return;
    }

    if (!isDragging) return;
    dragCurrent.x = e.clientX;
    dragCurrent.y = e.clientY;
  });

  window.addEventListener('mouseup', (e) => {
    if (isPanning) {
      isPanning = false;
      return;
    }

    if (!isDragging) return;
    isDragging = false;

    // Calculate final launch velocity vector
    const dx = dragCurrent.x - dragStart.x;
    const dy = dragCurrent.y - dragStart.y;
    
    // Scale velocity inversely with zoom so drag magnitude is consistent
    const vx = (dx * velocityScale) / canvasManager.camera.zoom;
    const vy = (dy * velocityScale) / canvasManager.camera.zoom;

    // Spawn config from UI setup
    const config = ui.getSpawnerConfig();

    // Map screen drag starting position to world coordinates
    const worldPos = canvasManager.screenToWorld(dragStart.x, dragStart.y);

    const newParticle = new Particle({
      x: worldPos.x,
      y: worldPos.y,
      vx: vx,
      vy: vy,
      mass: config.mass,
      charge: config.charge,
      radius: config.radius,
      color: config.color,
      fixed: config.fixed,
      isBlackHole: config.isBlackHole
    });

    engine.addParticle(newParticle);
  });

  // Right-Click Shortcut: Instantly spawn a massive fixed Black Hole
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Suppress default browser context menu
    
    // Block when landing page is active
    const landingPage = document.getElementById('landing-page');
    if (landingPage && !landingPage.classList.contains('hidden-landing')) return;
    
    const worldPos = canvasManager.screenToWorld(e.clientX, e.clientY);

    const blackHole = new Particle({
      x: worldPos.x,
      y: worldPos.y,
      vx: 0,
      vy: 0,
      mass: 8000,
      charge: 0,
      radius: 20,
      color: '#000000',
      fixed: true,
      isBlackHole: true
    });

    engine.addParticle(blackHole);
  });

  // Wheel Zoom Listener
  canvas.addEventListener('wheel', (e) => {
    const landingPage = document.getElementById('landing-page');
    if (landingPage && !landingPage.classList.contains('hidden-landing')) return;

    e.preventDefault(); // Disable window scrolling

    const zoomFactor = 1.08;
    const curZoom = canvasManager.camera.zoom;
    const mouseWorldBefore = canvasManager.screenToWorld(e.clientX, e.clientY);

    let newZoom;
    if (e.deltaY < 0) {
      newZoom = curZoom * zoomFactor;
    } else {
      newZoom = curZoom / zoomFactor;
    }

    newZoom = Math.max(0.04, Math.min(25, newZoom));
    canvasManager.camera.zoom = newZoom;

    const mouseWorldAfter = canvasManager.screenToWorld(e.clientX, e.clientY);
    canvasManager.camera.x += mouseWorldBefore.x - mouseWorldAfter.x;
    canvasManager.camera.y += mouseWorldBefore.y - mouseWorldAfter.y;
  }, { passive: false });

  // 4. Keyboard Shortcuts Binds
  window.addEventListener('keydown', (e) => {
    // Block shortcuts if landing page is still active
    const landingPage = document.getElementById('landing-page');
    if (landingPage && !landingPage.classList.contains('hidden-landing')) return;

    const key = e.key.toLowerCase();
    
    // Ignore keyboard shortcuts if user is typing in forms (though we don't have text fields)
    if (document.activeElement.tagName === 'INPUT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      ui.togglePause();
    } else if (key === 'c') {
      engine.clear();
      ui.energyHistory = [];
    } else if (key === 's') {
      ui.triggerStep();
    }
  });

  // 5. Load Initial Simulation Preset
  ui.loadSimulationPreset('solar-system');

  // 6. Loop Parameters
  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 0;
  let fpsTimer = 0;
  let diagnosticsUpdateTimer = 0;

  // 7. Core Loop Orchestration
  function animate(currentTime) {
    const dtReal = (currentTime - lastTime) / 16.666; // Normalize around 60 FPS = 1.0
    lastTime = currentTime;

    // Calculate FPS
    frameCount++;
    fpsTimer += dtReal * 16.666;
    if (fpsTimer >= 1000) {
      fps = Math.round((frameCount * 1000) / fpsTimer);
      frameCount = 0;
      fpsTimer = 0;
    }

    // Step Physics if running
    if (!ui.isPaused) {
      // Fetch time step multiplier from slider (allows slowing/speeding time)
      const dtSlider = parseFloat(ui.slideTimestep.value);
      // Run engine step
      engine.step(dtSlider);
    }

    // Render Everything
    let dragPreview = null;
    if (isDragging) {
      const spawnerConf = ui.getSpawnerConfig();
      dragPreview = {
        startX: dragStart.x,
        startY: dragStart.y,
        currentX: dragCurrent.x,
        currentY: dragCurrent.y,
        ...spawnerConf
      };
    }
    
    canvasManager.draw(dragPreview);

    // Throttle DOM textual diagnostics updates (10 frames) for performance optimization,
    // but keep drawing chart curves in real-time
    diagnosticsUpdateTimer += dtReal;
    if (diagnosticsUpdateTimer >= 10) {
      ui.updateDiagnostics(fps);
      diagnosticsUpdateTimer = 0;
    } else {
      // Update chart buffer only
      ui.drawEnergyChart();
    }

    // Keep loop active
    requestAnimationFrame(animate);
  }

  // 8. Remove initialization loader and kick off loops
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.add('fade-out');
    // Remove from DOM after transition completes
    setTimeout(() => loader.remove(), 600);
  }

  // 9. Synapse Landing Page Event Binds & Navigation
  const landingPage = document.getElementById('landing-page');
  
  if (landingPage) {
    // A. Bind all launch buttons (Nav pill & Hero)
    const launchButtons = document.querySelectorAll('.btn-launch');
    launchButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        landingPage.classList.add('hidden-landing');
        
        // Slide HUD sidebars into view
        const controlPanel = document.getElementById('control-panel');
        const inspectorPanel = document.getElementById('inspector-panel');
        const btnToggleLeft = document.getElementById('btn-toggle-left');
        const btnToggleRight = document.getElementById('btn-toggle-right');

        if (controlPanel) controlPanel.classList.remove('collapsed');
        if (btnToggleLeft) btnToggleLeft.textContent = '◀';
        if (inspectorPanel) inspectorPanel.classList.remove('collapsed');
        if (btnToggleRight) btnToggleRight.textContent = '▶';
      });
    });

    // B. Reveal on Scroll animations for feature cards & code block
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    const checkReveal = () => {
      const triggerBottom = window.innerHeight * 0.9;
      revealElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < triggerBottom) {
          el.classList.add('active');
        }
      });
    };
    
    // Check elements in view on initial load and on scroll
    checkReveal();
    landingPage.addEventListener('scroll', checkReveal);

    // C. Preset Links in Footer (auto-load and auto-launch)
    const presetLinks = document.querySelectorAll('.preset-link');
    presetLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const preset = link.dataset.preset;
        if (preset) {
          // Load preset physics properties
          ui.loadSimulationPreset(preset);
          // Sync select dropdown in sidebar
          const presetSelect = document.getElementById('preset-select');
          if (presetSelect) presetSelect.value = preset;
          
          // Launch the simulator
          landingPage.classList.add('hidden-landing');
          
          const controlPanel = document.getElementById('control-panel');
          const inspectorPanel = document.getElementById('inspector-panel');
          const btnToggleLeft = document.getElementById('btn-toggle-left');
          const btnToggleRight = document.getElementById('btn-toggle-right');

          if (controlPanel) controlPanel.classList.remove('collapsed');
          if (btnToggleLeft) btnToggleLeft.textContent = '◀';
          if (inspectorPanel) inspectorPanel.classList.remove('collapsed');
          if (btnToggleRight) btnToggleRight.textContent = '▶';
        }
      });
    });

    // D. Copy Button inside code editor block
    const copyBtn = document.querySelector('.code-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const codeElement = document.querySelector('.code-block pre code');
        if (codeElement) {
          navigator.clipboard.writeText(codeElement.innerText).then(() => {
            copyBtn.textContent = 'COPIED!';
            setTimeout(() => {
              copyBtn.textContent = 'COPY';
            }, 2000);
          });
        }
      });
    }
  }

  requestAnimationFrame(animate);
});
