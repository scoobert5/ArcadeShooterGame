export class Loop {
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private onUpdate: (dt: number) => void;
  private isRunning: boolean = false;

  constructor(onUpdate: (dt: number) => void) {
    this.onUpdate = onUpdate;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = () => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Seconds
    this.lastTime = currentTime;

    // Cap delta time to prevent spiraling physics if tab is backgrounded
    const safeDelta = Math.min(deltaTime, 0.1);

    this.onUpdate(safeDelta);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}