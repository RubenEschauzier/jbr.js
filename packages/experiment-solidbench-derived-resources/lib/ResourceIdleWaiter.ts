import type { IResourceReader, IResourceSnapshot } from './ContainerResourceReader';

export interface IResourceIdleWaiterOptions {
  /**
   * Maximum CPU usage in cores for a window to count as idle.
   */
  cpuThreshold: number;
  /**
   * Maximum block I/O (read + write) in bytes per second for a window to count as idle.
   */
  ioThreshold: number;
  /**
   * Maximum network traffic (received + transmitted) in bytes per second for a window to count as idle.
   */
  networkThreshold: number;
  /**
   * Length of a single window in milliseconds.
   */
  window: number;
  /**
   * Number of consecutive idle windows that are required.
   */
  windows: number;
  /**
   * Maximum time to wait in milliseconds, after which waiting is given up.
   */
  timeout: number;
}

export interface IResourceIdleWaitResult {
  /**
   * The time spent waiting in milliseconds.
   */
  idleWaitTime: number;
  /**
   * If the containers did not become idle within the timeout.
   */
  idleWaitTimedOut: boolean;
}

/**
 * Waits until a set of containers has been idle (CPU, block I/O, network) for a number of consecutive windows.
 */
export class ResourceIdleWaiter {
  public constructor(
    public readonly readers: IResourceReader[],
    public readonly options: IResourceIdleWaiterOptions,
    private readonly sleep: (durationMs: number) => Promise<void> =
    durationMs => new Promise(resolve => setTimeout(resolve, durationMs)),
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Check if the usage between two snapshots of a container is below all thresholds.
   */
  public isIdle(previous: IResourceSnapshot, current: IResourceSnapshot): boolean {
    const seconds = (current.time - previous.time) / 1_000_000;
    if (seconds <= 0) {
      return false;
    }
    const cpu = (current.cpuUsage - previous.cpuUsage) / 1_000_000 / seconds;
    const io = (current.ioReadBytes - previous.ioReadBytes + current.ioWriteBytes - previous.ioWriteBytes) /
      seconds;
    const network = (current.networkRxBytes - previous.networkRxBytes +
      current.networkTxBytes - previous.networkTxBytes) / seconds;
    return cpu <= this.options.cpuThreshold &&
      io <= this.options.ioThreshold &&
      network <= this.options.networkThreshold;
  }

  /**
   * Wait until all containers are idle, or the timeout has been reached.
   */
  public async waitForIdle(): Promise<IResourceIdleWaitResult> {
    const start = this.now();
    let previous = await this.readAll();
    let consecutiveIdle = 0;
    while (true) {
      await this.sleep(this.options.window);
      const current = await this.readAll();
      const idle = current.every((snapshot, i) => this.isIdle(previous[i], snapshot));
      consecutiveIdle = idle ? consecutiveIdle + 1 : 0;
      previous = current;

      const elapsed = this.now() - start;
      if (consecutiveIdle >= this.options.windows) {
        return { idleWaitTime: elapsed, idleWaitTimedOut: false };
      }
      if (elapsed >= this.options.timeout) {
        return { idleWaitTime: elapsed, idleWaitTimedOut: true };
      }
    }
  }

  protected async readAll(): Promise<IResourceSnapshot[]> {
    return Promise.all(this.readers.map(reader => reader.read()));
  }
}
