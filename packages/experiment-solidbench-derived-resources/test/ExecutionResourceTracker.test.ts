import type { IResourceReader, IResourceSnapshot } from '../lib/ContainerResourceReader';
import {
  computeResourceMetrics,
  ExecutionResourceTracker,
  getResourceMetricKeys,
  RESOURCE_METRIC_SUFFIXES,
  ResourceMeasurement,
} from '../lib/ExecutionResourceTracker';

function snapshot(time: number, cpuUsage: number, memoryAnon: number, extra: Partial<IResourceSnapshot> = {}):
IResourceSnapshot {
  return {
    time,
    cpuUsage,
    memoryAnon,
    memoryTotal: memoryAnon * 2,
    ioReadBytes: 0,
    ioWriteBytes: 0,
    networkRxBytes: 0,
    networkTxBytes: 0,
    ...extra,
  };
}

describe('ExecutionResourceTracker', () => {
  describe('getResourceMetricKeys', () => {
    it('should prefix all suffixes', () => {
      const keys = getResourceMetricKeys([ 'a', 'b' ]);
      expect(keys).toHaveLength(RESOURCE_METRIC_SUFFIXES.length * 2);
      expect(keys).toContain('aCpuAvg');
      expect(keys).toContain('bSamples');
    });
  });

  describe('computeResourceMetrics', () => {
    it('should compute metrics over multiple intervals', () => {
      const metrics = computeResourceMetrics('s', [
        snapshot(0, 0, 100, { ioReadBytes: 10, ioWriteBytes: 20, networkRxBytes: 30, networkTxBytes: 40 }),
        // 0.5 cores
        snapshot(100_000, 50_000, 300),
        // 2 cores
        snapshot(200_000, 250_000, 200),
        // Short interval, ignored for min/max
        snapshot(210_000, 260_000, 200, { ioReadBytes: 15, ioWriteBytes: 21, networkRxBytes: 32, networkTxBytes: 44 }),
      ], 50_000);
      expect(metrics).toEqual({
        sCpuAvg: 260_000 / 210_000,
        sCpuMin: 0.5,
        sCpuMax: 2,
        sCpuTime: 260,
        sMemoryAvg: ((100 + 300) / 2 * 100_000 + (300 + 200) / 2 * 100_000 + 200 * 10_000) / 210_000,
        sMemoryMin: 100,
        sMemoryMax: 300,
        sMemoryTotalMax: 600,
        sIoReadBytes: 5,
        sIoWriteBytes: 1,
        sNetworkRxBytes: 2,
        sNetworkTxBytes: 4,
        sSamples: 4,
      });
    });

    it('should use the average CPU when no interval is long enough', () => {
      const metrics = computeResourceMetrics('s', [
        snapshot(0, 0, 100),
        snapshot(1_000, 500, 100),
      ], 50_000);
      expect(metrics.sCpuAvg).toBe(0.5);
      expect(metrics.sCpuMin).toBe(0.5);
      expect(metrics.sCpuMax).toBe(0.5);
      expect(metrics.sMemoryAvg).toBe(100);
    });

    it('should handle zero-length executions and decreasing counters', () => {
      const metrics = computeResourceMetrics('s', [
        snapshot(5, 100, 100, { ioReadBytes: 10 }),
        snapshot(5, 50, 300, { ioReadBytes: 5 }),
      ], 0);
      expect(metrics.sCpuAvg).toBe(0);
      expect(metrics.sCpuMin).toBe(0);
      expect(metrics.sCpuMax).toBe(0);
      expect(metrics.sCpuTime).toBe(0);
      expect(metrics.sMemoryAvg).toBe(200);
      expect(metrics.sIoReadBytes).toBe(0);
    });

    it('should clamp negative interval CPU rates', () => {
      const metrics = computeResourceMetrics('s', [
        snapshot(0, 100, 100),
        snapshot(10, 50, 100),
        snapshot(20, 150, 100),
      ], 0);
      expect(metrics.sCpuMin).toBe(0);
      expect(metrics.sCpuMax).toBe(10);
    });
  });

  describe('start and stop', () => {
    let time: number;
    let cpu: number;
    let readerA: IResourceReader;
    let readerB: IResourceReader;

    beforeEach(() => {
      jest.useFakeTimers();
      time = 0;
      cpu = 0;
      readerA = { read: jest.fn(async() => snapshot(time, cpu, 10)) };
      readerB = { read: jest.fn(async() => snapshot(time, cpu * 2, 20)) };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    async function advance(ms: number, cpuDelta: number): Promise<void> {
      time += ms * 1_000;
      cpu += cpuDelta;
      await jest.advanceTimersByTimeAsync(ms);
    }

    it('should sample until stopped', async() => {
      const tracker = new ExecutionResourceTracker({ a: readerA, b: readerB }, 100);
      const measurement = await tracker.start();
      await advance(100, 100_000);
      await advance(100, 50_000);
      time += 10_000;
      cpu += 10_000;
      const metrics = await measurement.stop();

      expect(readerA.read).toHaveBeenCalledTimes(4);
      expect(readerB.read).toHaveBeenCalledTimes(4);
      expect(metrics.aSamples).toBe(4);
      expect(metrics.aCpuAvg).toBeCloseTo(160_000 / 210_000);
      expect(metrics.aCpuMin).toBeCloseTo(0.5);
      expect(metrics.aCpuMax).toBeCloseTo(1);
      expect(metrics.bCpuMax).toBeCloseTo(2);
      expect(metrics.bMemoryAvg).toBe(20);

      // No more sampling after stop
      await advance(500, 0);
      expect(readerA.read).toHaveBeenCalledTimes(4);
    });

    it('should stop immediately without waiting for the next sample', async() => {
      const tracker = new ExecutionResourceTracker({ a: readerA }, 100);
      const measurement = await tracker.start();
      const metrics = await measurement.stop();
      expect(metrics.aSamples).toBe(2);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should stop a measurement that never started sampling', async() => {
      const measurement = new ResourceMeasurement({ a: readerA }, 100);
      await measurement.sample();
      const metrics = await measurement.stop();
      expect(metrics.aSamples).toBe(2);
    });

    it('should skip failing intermediate samples', async() => {
      const tracker = new ExecutionResourceTracker({ a: readerA }, 100);
      const measurement = await tracker.start();
      jest.mocked(readerA.read).mockRejectedValueOnce(new Error('read failure'));
      await advance(100, 1_000);
      await advance(100, 1_000);
      const metrics = await measurement.stop();
      expect(metrics.aSamples).toBe(3);
    });

    it('should propagate a failing final sample', async() => {
      const tracker = new ExecutionResourceTracker({ a: readerA }, 100);
      const measurement = await tracker.start();
      jest.mocked(readerA.read).mockRejectedValueOnce(new Error('read failure'));
      await expect(measurement.stop()).rejects.toThrow('read failure');
    });

    it('should wait for an in-flight sample before stopping', async() => {
      const tracker = new ExecutionResourceTracker({ a: readerA }, 100);
      const measurement = await tracker.start();
      let resolveRead: (value: IResourceSnapshot) => void = () => {
        // Replaced below
      };
      jest.mocked(readerA.read).mockImplementationOnce(() => new Promise((resolve) => {
        resolveRead = resolve;
      }));
      await advance(100, 1_000);
      const stopPromise = measurement.stop();
      resolveRead(snapshot(time, cpu, 10));
      const metrics = await stopPromise;
      expect(metrics.aSamples).toBe(3);
    });
  });
});
