
import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { InputState } from '../core/InputManager';

/**
 * Dedicated system for updating particles from the GameState pool.
 * Decouples visual effects from gameplay logic (ProjectileSystem).
 */
export class ParticleSystem implements System {
  update(dt: number, state: GameState, input: InputState) {
    const pool = state.particlePool;
    let activeCount = 0;
    
    // Iterate fixed pool. Since MAX_PARTICLES is ~300, O(N) is cheap.
    // We only update active ones.
    for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.active) continue;

        activeCount++;
        p.lifetime -= dt;
        if (p.lifetime <= 0) {
            p.active = false;
            continue;
        }

        // Move
        p.position.x += p.velocity.x * dt;
        p.position.y += p.velocity.y * dt;
        
        // Simple drag for sparks to feel "light"
        if (p.style === 'spark') { 
            p.velocity.x *= 0.92;
            p.velocity.y *= 0.92;
        }
    }
    
    state.activeParticleCount = activeCount;
  }
}
