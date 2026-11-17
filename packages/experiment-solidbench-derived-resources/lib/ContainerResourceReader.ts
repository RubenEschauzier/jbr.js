import { readFile } from 'node:fs/promises';
import * as Path from 'node:path';

/**
 * A point-in-time reading of the cumulative resource counters of one container.
 */
export interface IResourceSnapshot {
  /**
   * Monotonic time of the reading, in microseconds.
   */
  time: number;
  /**
   * Cumulative CPU time consumed by the container, in microseconds.
   */
  cpuUsage: number;
  /**
   * Current memory usage including page cache, in bytes.
   */
  memoryTotal: number;
  /**
   * Current anonymous memory usage (excluding page cache), in bytes.
   */
  memoryAnon: number;
  /**
   * Cumulative bytes read from block devices.
   */
  ioReadBytes: number;
  /**
   * Cumulative bytes written to block devices.
   */
  ioWriteBytes: number;
  /**
   * Cumulative bytes received over all non-loopback network interfaces.
   */
  networkRxBytes: number;
  /**
   * Cumulative bytes transmitted over all non-loopback network interfaces.
   */
  networkTxBytes: number;
}

/**
 * Reads the cumulative resource counters of a single container.
 */
export interface IResourceReader {
  read: () => Promise<IResourceSnapshot>;
}

/**
 * The subset of a Dockerode container that is needed for reading resource usage.
 */
export interface IDockerContainerLike {
  id: string;
  inspect: () => Promise<{ State: { Pid: number }}>;
  stats: (options: { stream: false; 'one-shot': boolean }) => Promise<IDockerApiStats>;
}

/**
 * The subset of a Docker API container stats entry that is used here.
 * Field names follow the Docker API payload.
 */
export interface IDockerApiStats {
  cpu_stats: { cpu_usage: { total_usage: number }};
  memory_stats?: { usage?: number; stats?: { anon?: number; rss?: number }};
  blkio_stats?: { io_service_bytes_recursive?: { op: string; value: number }[] | null };
  networks?: Record<string, { rx_bytes: number; tx_bytes: number }>;
}

/**
 * Monotonic clock in microseconds.
 */
export function monotonicMicroseconds(): number {
  return Number(process.hrtime.bigint() / BigInt(1_000));
}

/**
 * Reads container resource counters directly from the cgroup v2 filesystem and procfs.
 * This is cheap (a few file reads) and exact, and requires the Docker daemon to run on the same host.
 */
export class CgroupResourceReader implements IResourceReader {
  public constructor(
    public readonly cgroupPath: string,
    public readonly netDevPath: string,
    private readonly now: () => number = monotonicMicroseconds,
  ) {}

  /**
   * Create a reader for the process with the given PID.
   * @param pid A process ID, typically the main process of a container.
   * @param procRoot The procfs mount point.
   * @param cgroupRoot The cgroup v2 mount point.
   */
  public static async fromPid(pid: number, procRoot = '/proc', cgroupRoot = '/sys/fs/cgroup'):
  Promise<CgroupResourceReader> {
    const cgroupFile = await readFile(Path.join(procRoot, `${pid}`, 'cgroup'), 'utf8');
    // In cgroup v2, there is a single line of the form '0::/path/to/cgroup'
    const line = cgroupFile.split('\n').find(entry => entry.startsWith('0::'));
    if (!line) {
      throw new Error(`Process ${pid} is not in a cgroup v2 hierarchy`);
    }
    const reader = new CgroupResourceReader(
      Path.join(cgroupRoot, line.slice(3).trim()),
      Path.join(procRoot, `${pid}`, 'net', 'dev'),
    );
    // Fail early if the counters can not be read
    await reader.read();
    return reader;
  }

  public async read(): Promise<IResourceSnapshot> {
    const [ cpuStat, memoryCurrent, memoryStat, ioStat, netDev ] = await Promise.all([
      readFile(Path.join(this.cgroupPath, 'cpu.stat'), 'utf8'),
      readFile(Path.join(this.cgroupPath, 'memory.current'), 'utf8'),
      readFile(Path.join(this.cgroupPath, 'memory.stat'), 'utf8'),
      readFile(Path.join(this.cgroupPath, 'io.stat'), 'utf8'),
      readFile(this.netDevPath, 'utf8'),
    ]);
    const time = this.now();
    const io = CgroupResourceReader.parseIoStat(ioStat);
    const network = CgroupResourceReader.parseNetDev(netDev);
    return {
      time,
      cpuUsage: CgroupResourceReader.parseKeyValue(cpuStat, 'usage_usec'),
      memoryTotal: Number.parseInt(memoryCurrent, 10),
      memoryAnon: CgroupResourceReader.parseKeyValue(memoryStat, 'anon'),
      ioReadBytes: io.read,
      ioWriteBytes: io.write,
      networkRxBytes: network.rx,
      networkTxBytes: network.tx,
    };
  }

  /**
   * Obtain the value of a key in a flat-keyed cgroup file such as cpu.stat or memory.stat.
   */
  public static parseKeyValue(contents: string, key: string): number {
    for (const line of contents.split('\n')) {
      const [ entryKey, value ] = line.split(' ');
      if (entryKey === key) {
        return Number.parseInt(value, 10);
      }
    }
    throw new Error(`Could not find key '${key}' in cgroup file`);
  }

  /**
   * Sum the read and written bytes over all devices in an io.stat file.
   */
  public static parseIoStat(contents: string): { read: number; write: number } {
    let read = 0;
    let write = 0;
    for (const match of contents.matchAll(/\b([rw])bytes=(\d+)/gu)) {
      if (match[1] === 'r') {
        read += Number.parseInt(match[2], 10);
      } else {
        write += Number.parseInt(match[2], 10);
      }
    }
    return { read, write };
  }

  /**
   * Sum the received and transmitted bytes over all non-loopback interfaces in a /proc/net/dev file.
   */
  public static parseNetDev(contents: string): { rx: number; tx: number } {
    let rx = 0;
    let tx = 0;
    for (const line of contents.split('\n')) {
      const separator = line.indexOf(':');
      if (separator < 0) {
        continue;
      }
      const iface = line.slice(0, separator).trim();
      if (iface === 'lo') {
        continue;
      }
      const fields = line.slice(separator + 1).trim().split(/\s+/u);
      rx += Number.parseInt(fields[0], 10);
      tx += Number.parseInt(fields[8], 10);
    }
    return { rx, tx };
  }
}

/**
 * Reads container resource counters through the Docker API.
 * This is a fallback for when the cgroup filesystem can not be read (e.g., a remote Docker daemon).
 * It is slower than reading the cgroup files directly, so sampling intervals should be larger.
 */
export class DockerApiResourceReader implements IResourceReader {
  public constructor(
    public readonly container: IDockerContainerLike,
    private readonly now: () => number = monotonicMicroseconds,
  ) {}

  public async read(): Promise<IResourceSnapshot> {
    const timeBefore = this.now();
    const stats = await this.container.stats({ stream: false, 'one-shot': true });
    // The stats are collected somewhere during the request, so take the middle as the best estimate.
    const time = (timeBefore + this.now()) / 2;

    let ioReadBytes = 0;
    let ioWriteBytes = 0;
    for (const entry of stats.blkio_stats?.io_service_bytes_recursive ?? []) {
      const op = entry.op.toLowerCase();
      if (op === 'read') {
        ioReadBytes += entry.value;
      } else if (op === 'write') {
        ioWriteBytes += entry.value;
      }
    }

    let networkRxBytes = 0;
    let networkTxBytes = 0;
    for (const network of Object.values(stats.networks ?? {})) {
      networkRxBytes += network.rx_bytes;
      networkTxBytes += network.tx_bytes;
    }

    const memoryTotal = stats.memory_stats?.usage ?? 0;
    const memoryStats = stats.memory_stats?.stats ?? {};
    return {
      time,
      // Docker reports CPU usage in nanoseconds
      cpuUsage: stats.cpu_stats.cpu_usage.total_usage / 1_000,
      memoryTotal,
      // Field 'anon' exists in cgroup v2, 'rss' in cgroup v1
      memoryAnon: memoryStats.anon ?? memoryStats.rss ?? memoryTotal,
      ioReadBytes,
      ioWriteBytes,
      networkRxBytes,
      networkTxBytes,
    };
  }
}

/**
 * Create a resource reader for the given Docker container.
 * Prefers reading cgroup files directly, and falls back to the Docker API if that fails.
 * @param container A Docker container.
 * @param warn Callback for warnings.
 * @param procRoot The procfs mount point.
 * @param cgroupRoot The cgroup v2 mount point.
 */
export async function createContainerResourceReader(
  container: IDockerContainerLike,
  warn: (message: string) => void,
  procRoot?: string,
  cgroupRoot?: string,
): Promise<IResourceReader> {
  try {
    const { State: { Pid: pid }} = await container.inspect();
    return await CgroupResourceReader.fromPid(pid, procRoot, cgroupRoot);
  } catch (error: unknown) {
    warn(`Could not read cgroup counters of container ${container.id}, falling back to the slower Docker API for per-query resource tracking: ${(<Error> error).message}`);
    return new DockerApiResourceReader(container);
  }
}
