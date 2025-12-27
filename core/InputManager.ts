export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  ability: boolean; // New input for Repulse Pulse
  escape: boolean; // Pause intent
  shop: boolean; // Open Shop intent
  pointer: { x: number; y: number };
}

export class InputManager {
  state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    ability: false,
    escape: false,
    shop: false,
    pointer: { x: 0, y: 0 },
  };

  constructor() {
    // Bindings will be set up in attach()
  }

  attach(element: HTMLElement) {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    // Prevent context menu on right click
    window.addEventListener('contextmenu', this.handleContextMenu);
    
    element.addEventListener('mousemove', this.handleMouseMove);
    element.addEventListener('mousedown', this.handleMouseDown);
    element.addEventListener('mouseup', this.handleMouseUp);
  }

  detach(element: HTMLElement) {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('contextmenu', this.handleContextMenu);
    
    element.removeEventListener('mousemove', this.handleMouseMove);
    element.removeEventListener('mousedown', this.handleMouseDown);
    element.removeEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * Resets all input flags to false. 
   * Useful when transitioning between game states (e.g., pausing, menu)
   * to prevent "stuck" keys or accidental firing.
   */
  reset() {
    this.state.up = false;
    this.state.down = false;
    this.state.left = false;
    this.state.right = false;
    this.state.fire = false;
    this.state.ability = false;
    this.state.escape = false;
    this.state.shop = false;
  }

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.state.up = true; break;
      case 'KeyS': case 'ArrowDown': this.state.down = true; break;
      case 'KeyA': case 'ArrowLeft': this.state.left = true; break;
      case 'KeyD': case 'ArrowRight': this.state.right = true; break;
      // Space is now Ability
      case 'Space': this.state.ability = true; break;
      case 'ShiftLeft': case 'ShiftRight': this.state.ability = true; break;
      case 'Escape': this.state.escape = true; break;
      case 'KeyU': this.state.shop = true; break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.state.up = false; break;
      case 'KeyS': case 'ArrowDown': this.state.down = false; break;
      case 'KeyA': case 'ArrowLeft': this.state.left = false; break;
      case 'KeyD': case 'ArrowRight': this.state.right = false; break;
      case 'Space': this.state.ability = false; break;
      case 'ShiftLeft': case 'ShiftRight': this.state.ability = false; break;
      case 'Escape': this.state.escape = false; break;
      case 'KeyU': this.state.shop = false; break;
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    // Coordinate translation happens here or in the engine
    // For now, raw client coordinates relative to the canvas
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    this.state.pointer.x = e.clientX - rect.left;
    this.state.pointer.y = e.clientY - rect.top;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
        // Left Click -> Fire
        this.state.fire = true;
    } else if (e.button === 2) {
        // Right Click -> Ability
        this.state.ability = true;
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
        this.state.fire = false;
    } else if (e.button === 2) {
        this.state.ability = false;
    }
  };

  getState(): InputState {
    return { ...this.state };
  }
}