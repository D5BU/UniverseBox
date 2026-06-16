/**
 * 2D Vector class for physics mathematics
 */
export class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  copy() {
    return new Vector2D(this.x, this.y);
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  div(n) {
    if (n !== 0) {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  mag() {
    return Math.sqrt(this.magSq());
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  normalize() {
    const m = this.mag();
    if (m !== 0) {
      this.div(m);
    }
    return this;
  }

  distSq(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  dist(v) {
    return Math.sqrt(this.distSq(v));
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  // Static Helper Methods
  static add(v1, v2) {
    return new Vector2D(v1.x + v2.x, v1.y + v2.y);
  }

  static sub(v1, v2) {
    return new Vector2D(v1.x - v2.x, v1.y - v2.y);
  }

  static mult(v, n) {
    return new Vector2D(v.x * n, v.y * n);
  }

  static dist(v1, v2) {
    return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
  }
}

/**
 * Particle class representing simulated entities
 */
export class Particle {
  constructor({
    x,
    y,
    vx = 0,
    vy = 0,
    mass = 10,
    charge = 0,
    radius = 8,
    color = '#ffffff',
    fixed = false,
    isBlackHole = false
  }) {
    this.pos = new Vector2D(x, y);
    this.vel = new Vector2D(vx, vy);
    this.acc = new Vector2D(0, 0);
    this.prevAcc = new Vector2D(0, 0); // Required for Verlet integration
    
    this.mass = mass;
    this.charge = charge;
    this.radius = radius;
    this.color = color;
    this.fixed = fixed;
    this.isBlackHole = isBlackHole;
    
    this.trail = [];
    this.maxTrailLength = 60;
    
    // Aesthetic pulse for active charge or black hole animation
    this.pulseAge = Math.random() * 100;
  }

  updateTrail() {
    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  applyForce(force) {
    if (this.fixed) return;
    // a = F / m
    this.acc.x += force.x / this.mass;
    this.acc.y += force.y / this.mass;
  }

  integratePosition(dt) {
    if (this.fixed) return;
    
    // x(t + dt) = x(t) + v(t)*dt + 0.5 * a(t) * dt^2
    this.pos.x += this.vel.x * dt + 0.5 * this.acc.x * dt * dt;
    this.pos.y += this.vel.y * dt + 0.5 * this.acc.y * dt * dt;
    
    // Store current acceleration for velocity integration step
    this.prevAcc.set(this.acc.x, this.acc.y);
    // Reset acceleration to accumulate next frame's forces
    this.acc.set(0, 0);
  }

  integrateVelocity(dt, drag) {
    if (this.fixed) {
      this.vel.set(0, 0);
      return;
    }
    
    // v(t + dt) = v(t) + 0.5 * (a(t) + a(t + dt)) * dt
    this.vel.x += 0.5 * (this.prevAcc.x + this.acc.x) * dt;
    this.vel.y += 0.5 * (this.prevAcc.y + this.acc.y) * dt;
    
    // Apply medium drag
    this.vel.mult(1 - drag * dt);
  }
}

/**
 * Handles all physics loops, interactions, and constraints
 */
export class PhysicsEngine {
  constructor() {
    this.particles = [];
    this.gravityConstant = 1.0;
    this.coulombConstant = 5.0;
    this.restitution = 0.8;
    this.drag = 0.00;
    this.softeningFactor = 12.0; // Avoid division by zero: epsilon
    this.boundaryBounce = false;
    this.softCollisions = true;
  }

  addParticle(particle) {
    this.particles.push(particle);
  }

  clear() {
    this.particles = [];
  }

  step(dt) {
    const len = this.particles.length;
    if (len === 0) return;

    // 1. POSITION UPDATE (Verlet Part 1)
    for (let i = 0; i < len; i++) {
      this.particles[i].integratePosition(dt);
    }

    // 2. BLACK HOLE INGESTION (Eat overlapping particles)
    const activeParticles = [];
    const particlesToRemove = new Set();

    for (let i = 0; i < len; i++) {
      const p1 = this.particles[i];
      if (p1.isBlackHole) {
        for (let j = 0; j < len; j++) {
          if (i === j) continue;
          const p2 = this.particles[j];
          if (particlesToRemove.has(p2)) continue;

          const dist = p1.pos.dist(p2.pos);
          // If within black hole event horizon (radius)
          if (dist < p1.radius) {
            particlesToRemove.add(p2);
            // Dynamic black hole absorbs mass & momentum
            if (!p1.fixed) {
              const totalMass = p1.mass + p2.mass;
              const vx = (p1.vel.x * p1.mass + p2.vel.x * p2.mass) / totalMass;
              const vy = (p1.vel.y * p1.mass + p2.vel.y * p2.mass) / totalMass;
              p1.vel.set(vx, vy);
              p1.mass = totalMass;
              // Expand radius slightly
              p1.radius = Math.min(120, p1.radius + p2.radius * 0.15);
            }
          }
        }
      }
    }

    // Filter out ingested particles
    this.particles = this.particles.filter(p => !particlesToRemove.has(p));

    // 3. FORCE CALCULATIONS (N-body interactions)
    // Compute pairwise forces (Newton's 3rd Law optimization)
    const currentLen = this.particles.length;
    for (let i = 0; i < currentLen; i++) {
      const p1 = this.particles[i];
      
      for (let j = i + 1; j < currentLen; j++) {
        const p2 = this.particles[j];
        
        const r = Vector2D.sub(p2.pos, p1.pos);
        const rSq = r.magSq();
        const dist = Math.sqrt(rSq);
        
        if (dist === 0) continue;

        // Softened denominator to avoid singularity
        const softSq = rSq + this.softeningFactor * this.softeningFactor;
        const softCube = softSq * Math.sqrt(softSq);

        // Gravitational force: F = G * m1 * m2 / r^2
        let fGravMag = 0;
        if (this.gravityConstant > 0) {
          fGravMag = (this.gravityConstant * p1.mass * p2.mass) / softCube;
        }

        // Electrostatic force: F = k_e * q1 * q2 / r^2
        let fElecMag = 0;
        if (this.coulombConstant > 0 && p1.charge !== 0 && p2.charge !== 0) {
          // Attracts if opposite signs (-), repels if same signs (+)
          fElecMag = -(this.coulombConstant * p1.charge * p2.charge) / softCube;
        }

        const fTotalMag = fGravMag + fElecMag;
        const force = Vector2D.mult(r, fTotalMag);

        // Apply forces symmetrically
        p1.applyForce(force);
        p2.applyForce(Vector2D.mult(force, -1));
      }
    }

    // 4. VELOCITY UPDATE (Verlet Part 2)
    for (let i = 0; i < currentLen; i++) {
      this.particles[i].integrateVelocity(dt, this.drag);
    }

    // 5. COLLISION DETECTION & RESOLUTION
    if (this.softCollisions) {
      this.resolveCollisions();
    }

    // 6. BOUNDARY CONSTRAINTS
    if (this.boundaryBounce) {
      this.handleBoundaries();
    }

    // 7. UPDATE TRAILS
    for (let i = 0; i < currentLen; i++) {
      this.particles[i].updateTrail();
    }
  }

  resolveCollisions() {
    const len = this.particles.length;
    for (let i = 0; i < len; i++) {
      const p1 = this.particles[i];
      for (let j = i + 1; j < len; j++) {
        const p2 = this.particles[j];

        // Skip absorption collisions (black holes eat instead of bounce)
        if (p1.isBlackHole || p2.isBlackHole) continue;

        const r = Vector2D.sub(p2.pos, p1.pos);
        const dist = r.mag();
        const minDist = p1.radius + p2.radius;

        if (dist < minDist) {
          // Normal collision vector
          const normal = dist === 0 ? new Vector2D(1, 0) : Vector2D.mult(r, 1 / dist);
          
          // 1. POSITION CORRECTION (Penetration resolution)
          const pen = minDist - dist;
          
          const invMass1 = p1.fixed ? 0 : 1 / p1.mass;
          const invMass2 = p2.fixed ? 0 : 1 / p2.mass;
          const totalInvMass = invMass1 + invMass2;

          if (totalInvMass > 0) {
            // Correct positions relative to mass
            const correction = Vector2D.mult(normal, pen / totalInvMass);
            if (!p1.fixed) p1.pos.sub(Vector2D.mult(correction, invMass1));
            if (!p2.fixed) p2.pos.add(Vector2D.mult(correction, invMass2));
          }

          // 2. VELOCITY CORRECTION (Elastic impulse)
          const relVel = Vector2D.sub(p2.vel, p1.vel);
          const velAlongNormal = relVel.dot(normal);

          // If moving apart, do nothing
          if (velAlongNormal > 0) continue;

          // Restitution (elasticity)
          const impulseScalar = -(1 + this.restitution) * velAlongNormal / totalInvMass;
          
          const impulse = Vector2D.mult(normal, impulseScalar);
          if (!p1.fixed) p1.vel.sub(Vector2D.mult(impulse, invMass1));
          if (!p2.fixed) p2.vel.add(Vector2D.mult(impulse, invMass2));
        }
      }
    }
  }

  handleBoundaries() {
    // Width and height will be configured dynamically by the canvas manager
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.fixed) continue;

      // X Boundaries
      if (p.pos.x - p.radius < 0) {
        p.pos.x = p.radius;
        p.vel.x = -p.vel.x * this.restitution;
      } else if (p.pos.x + p.radius > width) {
        p.pos.x = width - p.radius;
        p.vel.x = -p.vel.x * this.restitution;
      }

      // Y Boundaries
      if (p.pos.y - p.radius < 0) {
        p.pos.y = p.radius;
        p.vel.y = -p.vel.y * this.restitution;
      } else if (p.pos.y + p.radius > height) {
        p.pos.y = height - p.radius;
        p.vel.y = -p.vel.y * this.restitution;
      }
    }
  }

  /**
   * Diagnostic calculation of mechanical energy
   */
  calculateTotalEnergy() {
    let kineticEnergy = 0;
    let potentialEnergy = 0;
    const len = this.particles.length;

    for (let i = 0; i < len; i++) {
      const p1 = this.particles[i];
      
      // KE = 1/2 * m * v^2
      if (!p1.fixed) {
        kineticEnergy += 0.5 * p1.mass * p1.vel.magSq();
      }

      // Potential Energy (pairwise)
      for (let j = i + 1; j < len; j++) {
        const p2 = this.particles[j];
        const dist = p1.pos.dist(p2.pos);
        const softDist = Math.sqrt(dist * dist + this.softeningFactor * this.softeningFactor);

        if (softDist > 0) {
          // Gravitational PE = -G * m1 * m2 / r
          if (this.gravityConstant > 0) {
            potentialEnergy -= (this.gravityConstant * p1.mass * p2.mass) / softDist;
          }
          // Electrostatic PE = k_e * q1 * q2 / r
          if (this.coulombConstant > 0 && p1.charge !== 0 && p2.charge !== 0) {
            potentialEnergy += (this.coulombConstant * p1.charge * p2.charge) / softDist;
          }
        }
      }
    }

    return {
      ke: kineticEnergy,
      pe: potentialEnergy,
      te: kineticEnergy + potentialEnergy
    };
  }

  /**
   * Compute vector field values at a specific grid position (x, y)
   * Net Force acting on a test unit mass (m=1) with positive unit charge (q=1)
   */
  getNetForceAt(x, y) {
    const netForce = new Vector2D(0, 0);
    const testPos = new Vector2D(x, y);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const r = Vector2D.sub(p.pos, testPos);
      const rSq = r.magSq();
      const dist = Math.sqrt(rSq);

      if (dist < p.radius) continue; // Inside particle boundary, skip singularity

      const softSq = rSq + this.softeningFactor * this.softeningFactor;
      const softCube = softSq * Math.sqrt(softSq);

      // Force on a test mass m=1
      let fGrav = 0;
      if (this.gravityConstant > 0) {
        fGrav = (this.gravityConstant * p.mass * 1.0) / softCube;
      }

      // Force on a test positive charge q=1 (opposite charges attract)
      let fElec = 0;
      if (this.coulombConstant > 0 && p.charge !== 0) {
        fElec = -(this.coulombConstant * p.charge * 1.0) / softCube;
      }

      const fTotal = fGrav + fElec;
      netForce.add(Vector2D.mult(r, fTotal));
    }

    return netForce;
  }
}
