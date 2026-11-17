import type { IResourceReader, IResourceSnapshot } from './ContainerResourceReader';

/**
 * The metrics that are computed for each tracked container, prefixed by the container's key.
 *
 * - Cpu* values are in cores (1 = one fully used core).
 *   CpuAvg is exact (cumulative CPU time over wall time); CpuMin and CpuMax come from the sampling intervals.
 * - CpuTime is the exact CPU time consumed during the execution, in milliseconds.
 * - Memory* values are anonymous memory (excluding page cache) in bytes, from samples.
 *   MemoryAvg is time-weighted.
 * - MemoryTotalMax is the maximum sampled memory including page cache, in bytes.
 * - Io* and Network* values are exact byte counts consumed during the execution.
 * - Samples is the number of snapshots the sampled metrics are based on (including start and end).
 */
export const RESOURCE_METRIC_SUFFIXES = <const> [
  'CpuAvg',
  'CpuMin',
  'CpuMax',
  'CpuTime',
  'MemoryAvg',
  'MemoryMin',
  'MemoryMax',
  'MemoryTotalMax',
  'IoReadBytes',
  'IoWriteBytes',
  'NetworkRxBytes',
  'NetworkTxBytes',
  'Samples',
];

/**
 * Obtain all metric keys that will be produced for the given container keys.
 * @param prefixes Container keys, such as 'server'.
 */
export function getResourceMetricKeys(prefixes: string[]): string[] {
  return prefixes.flatMap(prefix => RESOURCE_METRIC_SUFFIXES.map(suffix => `${prefix}${suffix}`));
}

/**
 * Compute the metrics of a single container from its snapshots during one execution.
 * @param prefix The container key.
 * @param snapshots At least two chronologically ordered snapshots.
 * @param minIntervalUs Sampling intervals shorter than this (in microseconds) are ignored for CpuMin/CpuMax,
 *                      unless there are no other intervals, as very short intervals produce noisy rates.
 */
export function computeResourceMetrics(
  prefix: string,
  snapshots: IResourceSnapshot[],
  minIntervalUs: number,
): Record<string, number> {
  const first = snapshots[0];
  const last = snapshots.at(-1)!;
  const duration = last.time - first.time;
  const cpuTime = Math.max(0, last.cpuUsage - first.cpuUsage);
  const cpuAvg = duration > 0 ? cpuTime / duration : 0;

  let cpuMin = Number.POSITIVE_INFINITY;
  let cpuMax = Number.NEGATIVE_INFINITY;
  let memoryMin = first.memoryAnon;
  let memoryMax = first.memoryAnon;
  let memoryTotalMax = first.memoryTotal;
  let memoryArea = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const previous = snapshots[i - 1];
    const current = snapshots[i];
    const interval = current.time - previous.time;
    if (interval >= minIntervalUs && interval > 0) {
      const rate = Math.max(0, current.cpuUsage - previous.cpuUsage) / interval;
      cpuMin = Math.min(cpuMin, rate);
      cpuMax = Math.max(cpuMax, rate);
    }
    memoryMin = Math.min(memoryMin, current.memoryAnon);
    memoryMax = Math.max(memoryMax, current.memoryAnon);
    memoryTotalMax = Math.max(memoryTotalMax, current.memoryTotal);
    memoryArea += (previous.memoryAnon + current.memoryAnon) / 2 * interval;
  }
  if (!Number.isFinite(cpuMin)) {
    cpuMin = cpuAvg;
    cpuMax = cpuAvg;
  }
  const memoryAvg = duration > 0 ?
    memoryArea / duration :
    snapshots.reduce((sum, snapshot) => sum + snapshot.memoryAnon, 0) / snapshots.length;

  return {
    [`${prefix}CpuAvg`]: cpuAvg,
    [`${prefix}CpuMin`]: cpuMin,
    [`${prefix}CpuMax`]: cpuMax,
    [`${prefix}CpuTime`]: cpuTime / 1_000,
    [`${prefix}MemoryAvg`]: memoryAvg,
    [`${prefix}MemoryMin`]: memoryMin,
    [`${prefix}MemoryMax`]: memoryMax,
    [`${prefix}MemoryTotalMax`]: memoryTotalMax,
    [`${prefix}IoReadBytes`]: Math.max(0, last.ioReadBytes - first.ioReadBytes),
    [`${prefix}IoWriteBytes`]: Math.max(0, last.ioWriteBytes - first.ioWriteBytes),
    [`${prefix}NetworkRxBytes`]: Math.max(0, last.networkRxBytes - first.networkRxBytes),
    [`${prefix}NetworkTxBytes`]: Math.max(0, last.networkTxBytes - first.networkTxBytes),
    [`${prefix}Samples`]: snapshots.length,
  };
}

/**
 * Measures the resource usage of a set of containers during a single execution.
 */
export class ExecutionResourceTracker {
  /**
   * @param readers Resource readers, keyed by the prefix used for their metrics.
   * @param samplingInterval Time between samples in milliseconds.
   */
  public constructor(
    public readonly readers: Record<string, IResourceReader>,
    public readonly samplingInterval: number,
  ) {}

  /**
   * Take the initial snapshots and start sampling.
   * @returns A running measurement that must be stopped.
   */
  public async start(): Promise<ResourceMeasurement> {
    const measurement = new ResourceMeasurement(this.readers, this.samplingInterval);
    await measurement.sample();
    measurement.startSampling();
    return measurement;
  }
}

/**
 * A running measurement of resource usage, created by {@link ExecutionResourceTracker}.
 */
export class ResourceMeasurement {
  public readonly snapshots: Record<string, IResourceSnapshot[]>;
  private stopped = false;
  private samplingLoop: Promise<void> = Promise.resolve();
  private timeoutHandle: NodeJS.Timeout | undefined;
  private wakeUp: (() => void) | undefined;

  public constructor(
    private readonly readers: Record<string, IResourceReader>,
    private readonly samplingInterval: number,
  ) {
    this.snapshots = Object.fromEntries(Object.keys(readers).map(key => [ key, []]));
  }

  /**
   * Take one snapshot of every container.
   */
  public async sample(): Promise<void> {
    await Promise.all(Object.entries(this.readers).map(async([ key, reader ]) => {
      this.snapshots[key].push(await reader.read());
    }));
  }

  /**
   * Start the background sampling loop.
   */
  public startSampling(): void {
    this.samplingLoop = (async() => {
      while (!this.stopped) {
        await new Promise<void>((resolve) => {
          this.wakeUp = resolve;
          this.timeoutHandle = setTimeout(resolve, this.samplingInterval);
        });
        if (this.stopped) {
          break;
        }
        try {
          await this.sample();
        } catch {
          // Skip this sample, the final sample in stop() will report the error if it persists.
        }
      }
    })();
  }

  /**
   * Stop sampling, take the final snapshots, and compute the metrics.
   */
  public async stop(): Promise<Record<string, number>> {
    this.stopped = true;
    clearTimeout(this.timeoutHandle);
    this.wakeUp?.();
    await this.samplingLoop;
    await this.sample();

    const minIntervalUs = this.samplingInterval * 1_000 / 2;
    const metrics: Record<string, number> = {};
    for (const [ key, snapshots ] of Object.entries(this.snapshots)) {
      Object.assign(metrics, computeResourceMetrics(key, snapshots, minIntervalUs));
    }
    return metrics;
  }
}
