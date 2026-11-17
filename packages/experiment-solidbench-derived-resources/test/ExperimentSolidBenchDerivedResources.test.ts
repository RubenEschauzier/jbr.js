import * as Path from 'node:path';
import v8 from 'node:v8';
import type { Hook, ITaskContext, DockerContainerHandler, DockerResourceConstraints, ProcessHandler } from 'jbr';
import { StaticDockerResourceConstraints, createExperimentPaths } from 'jbr';
import { TestLogger } from 'jbr/test/TestLogger';
import { SparqlBenchmarkRunner } from 'sparql-benchmark-runner';
import { createContainerResourceReader } from '../lib/ContainerResourceReader';
import { ExecutionResourceTracker } from '../lib/ExecutionResourceTracker';
import { ExperimentSolidBenchDerivedResources } from '../lib/ExperimentSolidBenchDerivedResources';
import { ResourceIdleWaiter } from '../lib/ResourceIdleWaiter';
import { ResultAggregatorResourceTracking } from '../lib/ResultAggregatorResourceTracking';

jest.mock<any>('../lib/ContainerResourceReader', () => ({
  createContainerResourceReader: jest.fn(async(container: any) => ({ read: jest.fn(), container })),
}));

let generatorGenerate: any;
jest.mock<any>('solidbench/lib/Generator', () => ({
  Generator: jest.fn().mockImplementation(() => ({
    generate: generatorGenerate,
  })),
}));

let sparqlBenchmarkRun: any;
let queryLoaderLoadQueries: any;
let resultSerializerSerialize: any;
let resultSerializerRawSerialize: any;

jest.mock<any>('sparql-benchmark-runner', () => ({
  ResultAggregatorComunica: jest.requireActual('sparql-benchmark-runner').ResultAggregatorComunica,
  SparqlBenchmarkRunner: jest.fn().mockImplementation((options: any) => {
    options.logger('Test logger');
    return {
      runWithRawResults: sparqlBenchmarkRun,
    };
  }),
  ResultSerializerCsv: jest.fn().mockImplementation(() => ({
    serialize: resultSerializerSerialize,
  })),
  ResultSerializerRaw: jest.fn().mockImplementation(() => ({
    serialize: resultSerializerRawSerialize,
  })),
  QueryLoaderFile: jest.fn().mockImplementation(() => ({
    loadQueries: queryLoaderLoadQueries,
  })),
}));

let files: Record<string, boolean | string> = {};
let filesOut: Record<string, boolean | string> = {};
let dirsOut: Record<string, boolean | string> = {};
let otherEntries: string[] = [];
jest.mock<any>('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  async pathExists(path: string) {
    return path in files;
  },
  async mkdir(dirPath: string) {
    dirsOut[dirPath] = true;
  },
  createWriteStream: jest.fn((path: string) => {
    filesOut[path] = true;
  }),
  async ensureDir(dirPath: string) {
    dirsOut[dirPath] = true;
  },
  async readdir(dir: string) {
    const ret: any[] = [];
    for (const path of Object.keys(filesOut)) {
      if (path.startsWith(dir)) {
        let name = path.slice(dir.length + 1);
        const slashPos = name.indexOf('/');
        const isFile = slashPos < 0;
        if (!isFile) {
          name = name.slice(0, slashPos);
        }
        ret.push({
          name,
          isFile: () => isFile,
          isDirectory: () => !isFile,
        });
      }
    }
    for (const path of otherEntries) {
      if (path.startsWith(dir)) {
        ret.push({
          name: path.slice(dir.length + 1),
          isFile: () => false,
          isDirectory: () => false,
        });
      }
    }
    return ret;
  },
  async readFile(path: string) {
    if (!(path in filesOut)) {
      throw new Error(`Could not find file at ${path}`);
    }
    return filesOut[path];
  },
  async writeFile(path: string, contents: string) {
    return filesOut[path] = contents;
  },
}));

describe('ExperimentSolidBenchDerivedResources', () => {
  let serverHandlerStopCollectingStats: any;
  let serverHandler: DockerContainerHandler;
  let logger: any;
  let context: ITaskContext;
  let hookSparqlEndpoint: Hook;
  let endpointHandlerStopCollectingStats: any;
  let endpointHandler: ProcessHandler;
  let resourceConstraints: DockerResourceConstraints;
  let experiment: ExperimentSolidBenchDerivedResources;
  beforeEach(() => {
    serverHandlerStopCollectingStats = jest.fn();
    serverHandler = <any> {
      close: jest.fn(),
      startCollectingStats: jest.fn(() => serverHandlerStopCollectingStats),
      addTerminationHandler: jest.fn(),
      removeTerminationHandler: jest.fn(),
    };
    logger = new TestLogger();
    context = {
      cwd: 'CWD',
      experimentPaths: createExperimentPaths('CWD'),
      experimentName: 'EXP',
      mainModulePath: 'MMP',
      verbose: true,
      closeExperiment: jest.fn(),
      cleanupHandlers: [],
      logger,
      docker: <any> {
        imageBuilder: {
          build: jest.fn(),
          getImageName: (ctx: any, suffix: string) => `IMG-${suffix}`,
        },
        containerCreator: <any> {
          start: jest.fn(async() => serverHandler),
          remove: jest.fn(),
        },
        statsCollector: {
          collect: jest.fn(),
        },
        networkCreator: {
          create: jest.fn(() => ({
            network: { id: 'NETWORK' },
            startCollectingStats: jest.fn(() => jest.fn()),
            close: jest.fn(),
            addTerminationHandler: jest.fn(),
            removeTerminationHandler: jest.fn(),
          })),
          remove: jest.fn(),
        },
      },
    };
    endpointHandlerStopCollectingStats = jest.fn();
    endpointHandler = {
      close: jest.fn(),
      join: jest.fn(),
      startCollectingStats: jest.fn(() => endpointHandlerStopCollectingStats),
      addTerminationHandler: jest.fn(),
      removeTerminationHandler: jest.fn(),
    };
    hookSparqlEndpoint = <any> {
      prepare: jest.fn(),
      start: jest.fn(() => endpointHandler),
      clean: jest.fn(),
    };
    generatorGenerate = jest.fn();
    sparqlBenchmarkRun = jest.fn(async({ onStart, onStop }) => {
      await onStart();
      await onStop();
      return {
        aggregateResults: {},
        rawResults: {},
      };
    });
    queryLoaderLoadQueries = jest.fn();
    resultSerializerSerialize = jest.fn();
    resultSerializerRawSerialize = jest.fn();
    resourceConstraints = new StaticDockerResourceConstraints({}, {});
    experiment = new ExperimentSolidBenchDerivedResources({
      scale: '0.1',
      configEnhance: 'input/config-enhancer.json',
      configFragment: 'input/config-fragmenter.json',
      configQueries: 'input/config-queries.json',
      configServer: 'input/config-server.json',
      validationParamsUrl: 'input/config-validation-params.json',
      configValidation: 'input/config-validation-config.json',
      hadoopMemory: '4G',
      dockerfileServer: 'input/dockerfiles/Dockerfile-server',
      hookSparqlEndpoint,
      serverPort: 3_000,
      serverLogLevel: 'info',
      serverBaseUrl: 'http://localhost:3000',
      serverResourceConstraints: resourceConstraints,
      endpointUrl: 'http://localhost:3001/sparql',
      queryRunnerReplication: 3,
      queryRunnerWarmupRounds: 1,
      queryRunnerRequestDelay: 0,
      queryRunnerEndpointAvailabilityCheckTimeout: 1_000,
      queryRunnerUrlParams: {},
      queryTimeoutFallback: 600,
    });
    files = {};
    dirsOut = {};
    filesOut = {};
    otherEntries = [];
    jest.mocked(SparqlBenchmarkRunner).mockClear();
    jest.mocked(createContainerResourceReader).mockClear();
    jest.spyOn(<any> process, 'on').mockImplementation();
    jest.spyOn(v8, 'getHeapStatistics').mockImplementation(() => (<any>{ heap_size_limit: 8192 * 1024 * 1024 }));
  });

  describe('replaceBaseUrlInDir', () => {
    it('should handle nested directories', async() => {
      filesOut['dir/a.ttl'] = ``;
      filesOut['dir/b.ttl'] = `localhost:3000`;
      filesOut['dir/c/c.ttl'] = ``;
      filesOut['dir/c/d.ttl'] = ``;

      await experiment.replaceBaseUrlInDir('dir');

      expect(filesOut['dir/a.ttl']).toBe('');
      expect(filesOut['dir/b.ttl']).toBe('solidbench-server:3000');
      expect(filesOut['dir/c/c.ttl']).toBe('');
      expect(filesOut['dir/c/d.ttl']).toBe('');
    });

    it('should ignore entries that are neither files nor directories', async() => {
      filesOut['dir/a.ttl'] = `localhost:3000`;
      otherEntries = [ 'dir/socket' ];

      await experiment.replaceBaseUrlInDir('dir');

      expect(filesOut).toEqual({ 'dir/a.ttl': 'solidbench-server:3000' });
    });
  });

  describe('prepare', () => {
    it('should prepare the experiment', async() => {
      await experiment.prepare(context, false);

      expect(context.logger.warn).not.toHaveBeenCalled();
      expect(hookSparqlEndpoint.prepare).toHaveBeenCalledWith(context, false);
      expect(generatorGenerate).toHaveBeenCalledWith();
      expect(context.docker.imageBuilder.build).toHaveBeenCalledWith({
        cwd: context.cwd,
        dockerFile: 'input/dockerfiles/Dockerfile-server',
        auxiliaryFiles: [ 'input/config-server.json' ],
        imageName: 'IMG-solidbench-server',
        buildArgs: {
          CONFIG_SERVER: 'input/config-server.json',
          BASE_URL: 'http://localhost:3000',
          LOG_LEVEL: 'info',
        },
        logger,
      });
    });

    it('should prepare the experiment without validation', async() => {
      (<any>experiment).validationParamsUrl = undefined;
      (<any>experiment).configValidation = undefined;
      await experiment.prepare(context, false);

      expect(context.logger.warn).not.toHaveBeenCalled();
      expect(hookSparqlEndpoint.prepare).toHaveBeenCalledWith(context, false);
      expect(generatorGenerate).toHaveBeenCalledWith();
      expect(context.docker.imageBuilder.build).toHaveBeenCalledWith({
        cwd: context.cwd,
        dockerFile: 'input/dockerfiles/Dockerfile-server',
        auxiliaryFiles: [ 'input/config-server.json' ],
        imageName: 'IMG-solidbench-server',
        buildArgs: {
          CONFIG_SERVER: 'input/config-server.json',
          BASE_URL: 'http://localhost:3000',
          LOG_LEVEL: 'info',
        },
        logger,
      });
    });

    it('should warn when not enough memory for preparing', async() => {
      jest.spyOn(v8, 'getHeapStatistics').mockImplementation(() => (<any>{ heap_size_limit: 4096 * 1024 * 1024 }));

      await experiment.prepare(context, false);

      expect(context.logger.warn).toHaveBeenCalledWith(`SolidBench recommends allocating at least 8192 MB of memory, while only 4096 was allocated.
This can be configured using Node's --max_old_space_size option.`);
    });

    it('should prepare the experiment with force overwrite', async() => {
      await experiment.prepare(context, true);

      expect(hookSparqlEndpoint.prepare).toHaveBeenCalledWith(context, true);
      expect(generatorGenerate).toHaveBeenCalledWith();
      expect(context.docker.imageBuilder.build).toHaveBeenCalledWith({
        cwd: context.cwd,
        dockerFile: 'input/dockerfiles/Dockerfile-server',
        auxiliaryFiles: [ 'input/config-server.json' ],
        imageName: 'IMG-solidbench-server',
        buildArgs: {
          CONFIG_SERVER: 'input/config-server.json',
          BASE_URL: 'http://localhost:3000',
          LOG_LEVEL: 'info',
        },
        logger,
      });
    });
  });

  describe('run', () => {
    beforeEach(() => {
      experiment.httpAvailabilityLatch.sleepUntilAvailable = () => Promise.resolve();
    });

    it('should run the experiment', async() => {
      await experiment.run(context);

      expect(context.docker.networkCreator.create).toHaveBeenCalledWith({
        Name: 'IMG-solidbench-network',
      });
      expect(context.docker.containerCreator.start).toHaveBeenCalledWith({
        containerName: 'solidbench-server',
        imageName: 'IMG-solidbench-server',
        resourceConstraints,
        logFilePath: Path.join('CWD', 'output', 'logs', 'server.txt'),
        statsFilePath: Path.join(context.cwd, 'output', 'stats-server.csv'),
        hostConfig: {
          Binds: [
            `${context.experimentPaths.root}/generated/out-fragments/http/localhost_3000/:/data`,
          ],
          NetworkMode: 'NETWORK',
          PortBindings: {
            '3000/tcp': [
              { HostPort: `3000` },
            ],
          },
        },
      });
      expect(hookSparqlEndpoint.start).toHaveBeenCalledWith(context, { docker: { network: 'NETWORK' }});
      expect(serverHandler.startCollectingStats).toHaveBeenCalledWith();
      expect(endpointHandler.startCollectingStats).toHaveBeenCalledWith();
      expect(sparqlBenchmarkRun).toHaveBeenCalledWith(expect.anything());
      expect(serverHandler.close).toHaveBeenCalledWith();
      expect(endpointHandler.close).toHaveBeenCalledWith();
      expect(serverHandlerStopCollectingStats).toHaveBeenCalledWith();
      expect(endpointHandlerStopCollectingStats).toHaveBeenCalledWith();

      expect(resultSerializerSerialize).toHaveBeenCalledWith(Path.normalize('CWD/output/query-times.csv'), {});
      expect(resultSerializerRawSerialize).toHaveBeenCalledWith(
        Path.normalize('CWD/output/query-results-raw.json'),
        {},
      );

      expect(dirsOut).toEqual({
        'CWD/output': true,
        'CWD/output/logs': true,
      });
    });

    it('should not create an output dir if it already exists', async() => {
      files['CWD/output'] = true;
      await experiment.run(context);

      expect(dirsOut).toEqual({
        'CWD/output/logs': true,
      });
    });

    it('should not serialize raw results if the runner does not produce them', async() => {
      sparqlBenchmarkRun = jest.fn(async({ onStart, onStop }: any) => {
        await onStart();
        await onStop();
        return { aggregateResults: {}};
      });

      await experiment.run(context);

      expect(resultSerializerSerialize).toHaveBeenCalledWith(Path.normalize('CWD/output/query-times.csv'), {});
      expect(resultSerializerRawSerialize).not.toHaveBeenCalled();
    });

    it('should gracefully close services on SIGINT', async() => {
      jest.spyOn(<any> process, 'on').mockImplementation((event, cb) => {
        if (event === 'SIGINT') {
          (<() => void> cb)();
        }
      });

      await experiment.run(context);

      expect(context.docker.networkCreator.create).toHaveBeenCalledWith({ Name: 'IMG-solidbench-network' });
      expect(context.docker.networkCreator.create).toHaveBeenCalledWith({ Name: 'IMG-solidbench-network' });
      expect(context.docker.containerCreator.start).toHaveBeenCalledWith({
        containerName: 'solidbench-server',
        hostConfig: {
          Binds: [ 'CWD/generated/out-fragments/http/localhost_3000/:/data' ],
          NetworkMode: 'NETWORK',
          PortBindings: { '3000/tcp': [{ HostPort: '3000' }]},
        },
        imageName: 'IMG-solidbench-server',
        logFilePath: 'CWD/output/logs/server.txt',
        resourceConstraints: { cpu: {}, memory: {}},
        statsFilePath: 'CWD/output/stats-server.csv',
      });
      expect(hookSparqlEndpoint.start).toHaveBeenCalledWith(context, { docker: { network: 'NETWORK' }});
      expect(serverHandler.close).toHaveBeenCalledWith();
      expect(endpointHandler.close).toHaveBeenCalledWith();
    });

    it('should run the experiment with breakpoint', async() => {
      let breakpointBarrierResolver: any;
      const breakpointBarrier: any = () => new Promise((resolve) => {
        breakpointBarrierResolver = resolve;
      });
      const experimentEnd = experiment.run({ ...context, breakpointBarrier });

      await new Promise(setImmediate);

      expect(context.docker.networkCreator.create).toHaveBeenCalledWith({ Name: 'IMG-solidbench-network' });
      expect(hookSparqlEndpoint.start).toHaveBeenCalledWith(expect.anything(), { docker: { network: 'NETWORK' }});
      expect(serverHandler.startCollectingStats).toHaveBeenCalledWith();
      expect(endpointHandler.startCollectingStats).toHaveBeenCalledWith();
      expect(sparqlBenchmarkRun).toHaveBeenCalledWith(expect.anything());
      expect(serverHandler.close).not.toHaveBeenCalled();

      breakpointBarrierResolver();
      await experimentEnd;

      expect(serverHandler.close).toHaveBeenCalledWith();
      expect(endpointHandler.close).toHaveBeenCalledWith();
      expect(serverHandlerStopCollectingStats).toHaveBeenCalledWith();
      expect(endpointHandlerStopCollectingStats).toHaveBeenCalledWith();

      expect(dirsOut).toEqual({
        'CWD/output': true,
        'CWD/output/logs': true,
      });
    });

    it('should run the experiment with breakpoint and termination handler', async() => {
      let breakpointBarrierResolver: any;
      const breakpointBarrier: any = () => new Promise((resolve) => {
        breakpointBarrierResolver = resolve;
      });
      const experimentEnd = experiment.run({ ...context, breakpointBarrier });

      await new Promise(setImmediate);

      expect(context.docker.networkCreator.create).toHaveBeenCalledWith({ Name: 'IMG-solidbench-network' });
      expect(hookSparqlEndpoint.start).toHaveBeenCalledWith(expect.anything(), { docker: { network: 'NETWORK' }});
      expect(serverHandler.startCollectingStats).toHaveBeenCalledWith();
      expect(endpointHandler.startCollectingStats).toHaveBeenCalledWith();
      expect(sparqlBenchmarkRun).toHaveBeenCalledWith(expect.anything());
      expect(serverHandler.close).not.toHaveBeenCalled();

      const termHandler = jest.mocked(serverHandler.addTerminationHandler).mock.calls[0][0];
      termHandler('myProcess');

      expect(context.closeExperiment).toHaveBeenCalledTimes(1);

      breakpointBarrierResolver();
      await experimentEnd;

      expect(serverHandler.close).toHaveBeenCalledWith();
      expect(endpointHandler.close).toHaveBeenCalledWith();
      expect(serverHandlerStopCollectingStats).toHaveBeenCalledWith();
      expect(endpointHandlerStopCollectingStats).toHaveBeenCalledWith();

      expect(dirsOut).toEqual({
        'CWD/output': true,
        'CWD/output/logs': true,
      });
    });
  });

  describe('constructor', () => {
    it('should use default resource tracking options', () => {
      expect(experiment.queryResourceSamplingInterval).toBe(100);
      expect(experiment.queryResourceIdleCpuThreshold).toBe(0.05);
      expect(experiment.queryResourceIdleIoThreshold).toBe(100_000);
      expect(experiment.queryResourceIdleNetworkThreshold).toBe(10_000);
      expect(experiment.queryResourceIdleWindow).toBe(250);
      expect(experiment.queryResourceIdleWindows).toBe(2);
      expect(experiment.queryResourceIdleTimeout).toBe(30_000);
      expect(experiment.queryResourceIdleIncludeEndpoint).toBe(false);
    });

    it('should accept custom resource tracking options', () => {
      const custom = new ExperimentSolidBenchDerivedResources({
        ...(<any> experiment),
        queryResourceSamplingInterval: 50,
        queryResourceIdleCpuThreshold: 0.1,
        queryResourceIdleIoThreshold: 1,
        queryResourceIdleNetworkThreshold: 2,
        queryResourceIdleWindow: 100,
        queryResourceIdleWindows: 3,
        queryResourceIdleTimeout: 1_000,
        queryResourceIdleIncludeEndpoint: true,
      });
      expect(custom.queryResourceSamplingInterval).toBe(50);
      expect(custom.queryResourceIdleCpuThreshold).toBe(0.1);
      expect(custom.queryResourceIdleIoThreshold).toBe(1);
      expect(custom.queryResourceIdleNetworkThreshold).toBe(2);
      expect(custom.queryResourceIdleWindow).toBe(100);
      expect(custom.queryResourceIdleWindows).toBe(3);
      expect(custom.queryResourceIdleTimeout).toBe(1_000);
      expect(custom.queryResourceIdleIncludeEndpoint).toBe(true);
    });
  });

  describe('projectResourceResults', () => {
    it('should only keep resource-related fields', () => {
      const error = new Error('E');
      expect(experiment.projectResourceResults([
        <any> { name: 'q', id: '0', time: 1, results: 2, hash: 'H', timestamps: [], serverCpuAvg: 1, other: 3 },
        <any> { name: 'q', id: '1', time: 1, results: 0, hash: 'H', timestamps: [], error },
      ], [ 'serverCpuAvg', 'serverCpuMax' ])).toEqual([
        { name: 'q', id: '0', time: 1, results: 2, serverCpuAvg: 1 },
        { name: 'q', id: '1', time: 1, results: 0, error },
      ]);
    });
  });

  describe('run with per-query resource tracking', () => {
    const rawResults = [{ name: 'q', id: '0', time: 1, results: 1, hash: 'H', timestamps: [], serverCpuAvg: 1 }];

    function runnerOptions(): any {
      return jest.mocked(SparqlBenchmarkRunner).mock.calls[0][0];
    }

    beforeEach(() => {
      experiment.httpAvailabilityLatch.sleepUntilAvailable = () => Promise.resolve();
      (<any> serverHandler).container = { id: 'SERVER' };
      (<any> endpointHandler).container = { id: 'ENDPOINT' };
      sparqlBenchmarkRun = jest.fn(async({ onStart, onStop }) => {
        await onStart();
        await onStop();
        return { aggregateResults: [], rawResults };
      });
    });

    it('should track the server and endpoint, and wait for the server to be idle', async() => {
      await experiment.run(context);

      expect(createContainerResourceReader).toHaveBeenCalledTimes(2);
      expect(createContainerResourceReader).toHaveBeenCalledWith({ id: 'SERVER' }, expect.any(Function));
      expect(createContainerResourceReader).toHaveBeenCalledWith({ id: 'ENDPOINT' }, expect.any(Function));

      const options = runnerOptions();
      expect(options.resourceTracker).toBeInstanceOf(ExecutionResourceTracker);
      expect(Object.keys(options.resourceTracker.readers)).toEqual([ 'server', 'endpoint' ]);
      expect(options.resourceTracker.samplingInterval).toBe(100);
      expect(options.idleWaiter).toBeInstanceOf(ResourceIdleWaiter);
      expect(options.idleWaiter.readers.map((reader: any) => reader.container.id)).toEqual([ 'SERVER' ]);
      expect(options.idleWaiter.options).toEqual({
        cpuThreshold: 0.05,
        ioThreshold: 100_000,
        networkThreshold: 10_000,
        window: 250,
        windows: 2,
        timeout: 30_000,
      });
      expect(options.resultAggregator).toBeInstanceOf(ResultAggregatorResourceTracking);
      expect(options.resultAggregator.metricKeys).toContain('serverCpuAvg');
      expect(options.resultAggregator.metricKeys).toContain('endpointMemoryMax');
      expect(options.resultAggregator.metricKeys).toContain('idleWaitTime');

      expect(resultSerializerSerialize).toHaveBeenCalledWith(Path.normalize('CWD/output/query-times.csv'), []);
      expect(resultSerializerSerialize).toHaveBeenCalledWith(
        Path.normalize('CWD/output/query-resources-raw.csv'),
        [{ name: 'q', id: '0', time: 1, results: 1, serverCpuAvg: 1 }],
      );
      expect(resultSerializerRawSerialize).toHaveBeenCalledWith(
        Path.normalize('CWD/output/query-results-raw.json'),
        rawResults,
      );
      expect(context.logger.warn).not.toHaveBeenCalled();
    });

    it('should forward reader warnings to the logger', async() => {
      await experiment.run(context);

      const warn = jest.mocked(createContainerResourceReader).mock.calls[0][1];
      warn('WARNING');
      expect(context.logger.warn).toHaveBeenCalledWith('WARNING');
    });

    it('should include the endpoint in idle waiting if configured', async() => {
      (<any> experiment).queryResourceIdleIncludeEndpoint = true;
      await experiment.run(context);

      expect(runnerOptions().idleWaiter.readers.map((reader: any) => reader.container.id))
        .toEqual([ 'SERVER', 'ENDPOINT' ]);
    });

    it('should not wait for idleness if idle windows is 0', async() => {
      (<any> experiment).queryResourceIdleWindows = 0;
      await experiment.run(context);

      expect(runnerOptions().resourceTracker).toBeInstanceOf(ExecutionResourceTracker);
      expect(runnerOptions().idleWaiter).toBeUndefined();
    });

    it('should not track or wait if the sampling interval is 0', async() => {
      (<any> experiment).queryResourceSamplingInterval = 0;
      await experiment.run(context);

      expect(createContainerResourceReader).not.toHaveBeenCalled();
      expect(runnerOptions().resourceTracker).toBeUndefined();
      expect(runnerOptions().idleWaiter).toBeUndefined();
      expect(runnerOptions().resultAggregator.metricKeys).toEqual([]);
      expect(resultSerializerSerialize).not.toHaveBeenCalledWith(
        Path.normalize('CWD/output/query-resources-raw.csv'),
        expect.anything(),
      );
      expect(context.logger.warn).not.toHaveBeenCalled();
    });

    it('should only track the server if the endpoint is not a Docker container', async() => {
      delete (<any> endpointHandler).container;
      await experiment.run(context);

      expect(Object.keys(runnerOptions().resourceTracker.readers)).toEqual([ 'server' ]);
      expect(context.logger.warn).toHaveBeenCalledWith(
        'Per-query resource tracking is skipped for the endpoint, as it does not run in a Docker container',
      );
    });

    it('should only track the endpoint if the server is not a Docker container', async() => {
      delete (<any> serverHandler).container;
      await experiment.run(context);

      expect(Object.keys(runnerOptions().resourceTracker.readers)).toEqual([ 'endpoint' ]);
      expect(runnerOptions().idleWaiter).toBeUndefined();
    });

    it('should not write resource results if the runner produces no raw results', async() => {
      sparqlBenchmarkRun = jest.fn(async() => ({ aggregateResults: []}));
      await experiment.run(context);

      expect(resultSerializerSerialize).toHaveBeenCalledTimes(1);
      expect(resultSerializerRawSerialize).not.toHaveBeenCalled();
    });

    it('should pass the standard runner options', async() => {
      await experiment.run(context);

      expect(runnerOptions()).toMatchObject({
        endpoint: 'http://localhost:3001/sparql',
        replication: 3,
        warmup: 1,
        requestDelay: 0,
        availabilityCheckTimeout: 1_000,
        timeout: 600,
      });
    });
  });

  describe('clean', () => {
    it('should clean without targets', async() => {
      await experiment.clean(context, {});

      expect(hookSparqlEndpoint.clean).toHaveBeenCalledWith(context, {});
    });

    it('should clean with docker target', async() => {
      await experiment.clean(context, { docker: true });

      expect(hookSparqlEndpoint.clean).toHaveBeenCalledWith(context, { docker: true });

      expect(context.docker.networkCreator.remove)
        .toHaveBeenCalledWith('IMG-solidbench-network');
      expect(context.docker.containerCreator.remove).toHaveBeenCalledWith('solidbench-server');
    });
  });
});
