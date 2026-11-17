import type { IResourceReader, IResourceSnapshot } from '../lib/ContainerResourceReader';
import type { IResourceIdleWaiterOptions } from '../lib/ResourceIdleWaiter';
import { ResourceIdleWaiter } from '../lib/ResourceIdleWaiter';

interface IUsage {
  cpu?: number;
  io?: number;
  network?: number;
}

/**
 * Create a fake reader whose counters grow by the given usage (per second) in each consecutive window.
 * Windows are 1 second long.
 */
function createReader(windows: IUsage[]): IResourceReader {
  let i = 0;
  const current: IResourceSnapshot = {
    time: 0,
    cpuUsage: 0,
    memoryAnon: 0,
    memoryTotal: 0,
    ioReadBytes: 0,
    ioWriteBytes: 0,
    networkRxBytes: 0,
    networkTxBytes: 0,
  };
  return {
    read: jest.fn(async() => {
      if (i > 0) {
        const usage = windows[Math.min(i - 1, windows.length - 1)];
        current.time += 1_000_000;
        current.cpuUsage += (usage.cpu ?? 0) * 1_000_000;
        current.ioReadBytes += (usage.io ?? 0) / 2;
        current.ioWriteBytes += (usage.io ?? 0) / 2;
        current.networkRxBytes += (usage.network ?? 0) / 2;
        current.networkTxBytes += (usage.network ?? 0) / 2;
      }
      i++;
      return { ...current };
    }),
  };
}

describe('ResourceIdleWaiter', () => {
  let options: IResourceIdleWaiterOptions;
  let now: number;
  let sleep: jest.Mock;

  beforeEach(() => {
    options = {
      cpuThreshold: 0.05,
      ioThreshold: 100,
      networkThreshold: 10,
      window: 1_000,
      windows: 2,
      timeout: 10_000,
    };
    now = 0;
    sleep = jest.fn(async(durationMs: number) => {
      now += durationMs;
    });
  });

  function createWaiter(readers: IResourceReader[]): ResourceIdleWaiter {
    return new ResourceIdleWaiter(readers, options, sleep, () => now);
  }

  it('should return after the required number of idle windows', async() => {
    const waiter = createWaiter([ createReader([{}]) ]);
    await expect(waiter.waitForIdle()).resolves.toEqual({ idleWaitTime: 2_000, idleWaitTimedOut: false });
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it('should restart counting after a busy window', async() => {
    const waiter = createWaiter([ createReader([{}, { cpu: 1 }, {}, { io: 1_000 }, {}, { network: 100 }, {}]) ]);
    await expect(waiter.waitForIdle()).resolves.toEqual({ idleWaitTime: 8_000, idleWaitTimedOut: false });
  });

  it('should require all readers to be idle', async() => {
    const waiter = createWaiter([
      createReader([{}]),
      createReader([{ cpu: 1 }, { cpu: 1 }, {}]),
    ]);
    await expect(waiter.waitForIdle()).resolves.toEqual({ idleWaitTime: 4_000, idleWaitTimedOut: false });
  });

  it('should give up after the timeout', async() => {
    const waiter = createWaiter([ createReader([{ cpu: 1 }]) ]);
    await expect(waiter.waitForIdle()).resolves.toEqual({ idleWaitTime: 10_000, idleWaitTimedOut: true });
  });

  it('should use the default sleep and clock', async() => {
    options.window = 1;
    options.windows = 1;
    const reader = createReader([{}]);
    const waiter = new ResourceIdleWaiter([ reader ], options);
    const result = await waiter.waitForIdle();
    expect(result.idleWaitTimedOut).toBe(false);
    expect(result.idleWaitTime).toBeGreaterThanOrEqual(0);
  });

  describe('isIdle', () => {
    const base: IResourceSnapshot = {
      time: 0,
      cpuUsage: 0,
      memoryAnon: 0,
      memoryTotal: 0,
      ioReadBytes: 0,
      ioWriteBytes: 0,
      networkRxBytes: 0,
      networkTxBytes: 0,
    };

    it('should not consider zero-length windows idle', () => {
      expect(createWaiter([]).isIdle(base, base)).toBe(false);
    });

    it('should consider usage at the threshold idle', () => {
      expect(createWaiter([]).isIdle(base, {
        ...base,
        time: 1_000_000,
        cpuUsage: 50_000,
        ioReadBytes: 50,
        ioWriteBytes: 50,
        networkRxBytes: 5,
        networkTxBytes: 5,
      })).toBe(true);
    });
  });
});
