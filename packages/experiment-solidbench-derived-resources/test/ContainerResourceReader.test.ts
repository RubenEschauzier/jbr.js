import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import * as Os from 'node:os';
import * as Path from 'node:path';
import type { IDockerApiStats, IDockerContainerLike } from '../lib/ContainerResourceReader';
import {
  CgroupResourceReader,
  createContainerResourceReader,
  DockerApiResourceReader,
  monotonicMicroseconds,
} from '../lib/ContainerResourceReader';

const CPU_STAT = `usage_usec 3070647
user_usec 2890726
system_usec 179920
`;
const MEMORY_STAT = `anon_thp 0
anon 97619968
file 6049792
`;
const IO_STAT = `259:0 rbytes=6045696 wbytes=8192 rios=278 wios=2 dbytes=0 dios=0
8:0 rbytes=4 wbytes=6 rios=1 wios=1 dbytes=0 dios=0
`;
const NET_DEV = `Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo:     500       5    0    0    0     0          0         0      500       5    0    0    0     0       0          0
  eth0:   11327      97    0    0    0     0          0         0      126       3    0    0    0     0       0          0
  eth1:       3       1    0    0    0     0          0         0        4       1    0    0    0     0       0          0
`;

describe('ContainerResourceReader', () => {
  let root: string;
  let procRoot: string;
  let cgroupRoot: string;
  let cgroupDir: string;

  beforeEach(async() => {
    root = await mkdtemp(Path.join(Os.tmpdir(), 'jbr-resource-reader-'));
    procRoot = Path.join(root, 'proc');
    cgroupRoot = Path.join(root, 'cgroup');
    cgroupDir = Path.join(cgroupRoot, 'system.slice', 'docker-abc.scope');
    await mkdir(Path.join(procRoot, '123', 'net'), { recursive: true });
    await mkdir(cgroupDir, { recursive: true });
    await writeFile(Path.join(procRoot, '123', 'cgroup'), '0::/system.slice/docker-abc.scope\n');
    await writeFile(Path.join(procRoot, '123', 'net', 'dev'), NET_DEV);
    await writeFile(Path.join(cgroupDir, 'cpu.stat'), CPU_STAT);
    await writeFile(Path.join(cgroupDir, 'memory.current'), '105017344\n');
    await writeFile(Path.join(cgroupDir, 'memory.stat'), MEMORY_STAT);
    await writeFile(Path.join(cgroupDir, 'io.stat'), IO_STAT);
  });

  afterEach(async() => {
    await rm(root, { recursive: true, force: true });
  });

  describe('monotonicMicroseconds', () => {
    it('should return increasing values in microseconds', () => {
      const first = monotonicMicroseconds();
      const second = monotonicMicroseconds();
      expect(second).toBeGreaterThanOrEqual(first);
      expect(Number.isInteger(first)).toBe(true);
    });
  });

  describe('CgroupResourceReader', () => {
    it('should be created from a pid and read all counters', async() => {
      const reader = await CgroupResourceReader.fromPid(123, procRoot, cgroupRoot);
      expect(reader.cgroupPath).toBe(cgroupDir);
      expect(reader.netDevPath).toBe(Path.join(procRoot, '123', 'net', 'dev'));

      const snapshot = await reader.read();
      expect(snapshot).toEqual({
        time: expect.any(Number),
        cpuUsage: 3070647,
        memoryTotal: 105017344,
        memoryAnon: 97619968,
        ioReadBytes: 6045700,
        ioWriteBytes: 8198,
        networkRxBytes: 11330,
        networkTxBytes: 130,
      });
    });

    it('should use the default mount points', async() => {
      await expect(CgroupResourceReader.fromPid(-1)).rejects.toThrow('ENOENT');
    });

    it('should use the given clock', async() => {
      const reader = new CgroupResourceReader(cgroupDir, Path.join(procRoot, '123', 'net', 'dev'), () => 42);
      expect((await reader.read()).time).toBe(42);
    });

    it('should reject a process outside a cgroup v2 hierarchy', async() => {
      await writeFile(Path.join(procRoot, '123', 'cgroup'), '12:cpu,cpuacct:/docker/abc\n');
      await expect(CgroupResourceReader.fromPid(123, procRoot, cgroupRoot))
        .rejects.toThrow('Process 123 is not in a cgroup v2 hierarchy');
    });

    it('should reject when counters can not be read', async() => {
      await rm(Path.join(cgroupDir, 'io.stat'));
      await expect(CgroupResourceReader.fromPid(123, procRoot, cgroupRoot)).rejects.toThrow('ENOENT');
    });

    it('should reject when a key is missing', async() => {
      await writeFile(Path.join(cgroupDir, 'memory.stat'), 'file 1\n');
      await expect(CgroupResourceReader.fromPid(123, procRoot, cgroupRoot))
        .rejects.toThrow(`Could not find key 'anon' in cgroup file`);
    });

    it('should parse an empty io.stat', () => {
      expect(CgroupResourceReader.parseIoStat('')).toEqual({ read: 0, write: 0 });
    });
  });

  describe('DockerApiResourceReader', () => {
    let stats: IDockerApiStats;
    let container: IDockerContainerLike;

    beforeEach(() => {
      stats = {
        cpu_stats: { cpu_usage: { total_usage: 5_000_000 }},
        memory_stats: { usage: 1_000, stats: { anon: 800 }},
        blkio_stats: {
          io_service_bytes_recursive: [
            { op: 'read', value: 10 },
            { op: 'Write', value: 20 },
            { op: 'Read', value: 1 },
            { op: 'total', value: 31 },
          ],
        },
        networks: {
          eth0: { rx_bytes: 100, tx_bytes: 200 },
          eth1: { rx_bytes: 1, tx_bytes: 2 },
        },
      };
      container = {
        id: 'ID',
        inspect: jest.fn(),
        stats: jest.fn(async() => stats),
      };
    });

    it('should read all counters', async() => {
      let time = 10;
      const reader = new DockerApiResourceReader(container, () => time++);
      await expect(reader.read()).resolves.toEqual({
        time: 10.5,
        cpuUsage: 5_000,
        memoryTotal: 1_000,
        memoryAnon: 800,
        ioReadBytes: 11,
        ioWriteBytes: 20,
        networkRxBytes: 101,
        networkTxBytes: 202,
      });
      expect(container.stats).toHaveBeenCalledWith({ stream: false, 'one-shot': true });
    });

    it('should fall back to rss for cgroup v1', async() => {
      stats.memory_stats = { usage: 1_000, stats: { rss: 700 }};
      const reader = new DockerApiResourceReader(container);
      expect((await reader.read()).memoryAnon).toBe(700);
    });

    it('should fall back to total memory without memory details', async() => {
      stats.memory_stats = { usage: 1_000 };
      const reader = new DockerApiResourceReader(container);
      expect((await reader.read()).memoryAnon).toBe(1_000);
    });

    it('should handle missing optional stats', async() => {
      stats = { cpu_stats: { cpu_usage: { total_usage: 0 }}, blkio_stats: { io_service_bytes_recursive: null }};
      const reader = new DockerApiResourceReader(container);
      await expect(reader.read()).resolves.toEqual({
        time: expect.any(Number),
        cpuUsage: 0,
        memoryTotal: 0,
        memoryAnon: 0,
        ioReadBytes: 0,
        ioWriteBytes: 0,
        networkRxBytes: 0,
        networkTxBytes: 0,
      });
    });

    it('should handle missing block I/O stats', async() => {
      stats = { cpu_stats: { cpu_usage: { total_usage: 0 }}};
      const reader = new DockerApiResourceReader(container);
      expect((await reader.read()).ioReadBytes).toBe(0);
    });
  });

  describe('createContainerResourceReader', () => {
    it('should create a cgroup reader when possible', async() => {
      const warn = jest.fn();
      const container: IDockerContainerLike = {
        id: 'ID',
        inspect: jest.fn(async() => ({ State: { Pid: 123 }})),
        stats: jest.fn(),
      };
      const reader = await createContainerResourceReader(container, warn, procRoot, cgroupRoot);
      expect(reader).toBeInstanceOf(CgroupResourceReader);
      expect(warn).not.toHaveBeenCalled();
    });

    it('should fall back to the Docker API when cgroup files can not be read', async() => {
      const warn = jest.fn();
      const container: IDockerContainerLike = {
        id: 'ID',
        inspect: jest.fn(async() => ({ State: { Pid: 456 }})),
        stats: jest.fn(),
      };
      const reader = await createContainerResourceReader(container, warn, procRoot, cgroupRoot);
      expect(reader).toBeInstanceOf(DockerApiResourceReader);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Could not read cgroup counters of container ID'));
    });
  });
});
