import * as Path from 'node:path';
import type { IExperimentSolidBenchOptions } from '@jbr-experiment/solidbench';
import { ExperimentSolidBench } from '@jbr-experiment/solidbench';
import * as fs from 'fs-extra';
import type { ITaskContext, ProcessHandler } from 'jbr';
import { ProcessHandlerComposite, secureProcessHandler } from 'jbr';
import type { IResult, IResultSerializer } from 'sparql-benchmark-runner';
import { QueryLoaderFile, ResultSerializerCsv, ResultSerializerRaw } from 'sparql-benchmark-runner';
import type { IDockerContainerLike, IResourceReader } from './ContainerResourceReader';
import { createContainerResourceReader } from './ContainerResourceReader';
import { ExecutionResourceTracker, getResourceMetricKeys } from './ExecutionResourceTracker';
import { ResourceIdleWaiter } from './ResourceIdleWaiter';
import { ResultAggregatorResourceTracking } from './ResultAggregatorResourceTracking';
import { SparqlBenchmarkRunnerResourceTracking } from './SparqlBenchmarkRunnerResourceTracking';

/**
 * An experiment instance for the SolidBench social network benchmark,
 * fragmented into pods that expose derived resources.
 *
 * In addition to the whole-run container stats of the parent experiment,
 * this measures the CPU, memory, block I/O and network usage of the server and SPARQL endpoint containers
 * during every individual query execution, and optionally waits until the server is idle before each execution.
 */
export class ExperimentSolidBenchDerivedResources extends ExperimentSolidBench {
  public readonly queryResourceSamplingInterval: number;
  public readonly queryResourceIdleCpuThreshold: number;
  public readonly queryResourceIdleIoThreshold: number;
  public readonly queryResourceIdleNetworkThreshold: number;
  public readonly queryResourceIdleWindow: number;
  public readonly queryResourceIdleWindows: number;
  public readonly queryResourceIdleTimeout: number;
  public readonly queryResourceIdleIncludeEndpoint: boolean;

  public constructor(options: IExperimentSolidBenchDerivedResourcesOptions) {
    super(options);
    this.queryResourceSamplingInterval = options.queryResourceSamplingInterval ?? 100;
    this.queryResourceIdleCpuThreshold = options.queryResourceIdleCpuThreshold ?? 0.05;
    this.queryResourceIdleIoThreshold = options.queryResourceIdleIoThreshold ?? 100_000;
    this.queryResourceIdleNetworkThreshold = options.queryResourceIdleNetworkThreshold ?? 10_000;
    this.queryResourceIdleWindow = options.queryResourceIdleWindow ?? 250;
    this.queryResourceIdleWindows = options.queryResourceIdleWindows ?? 2;
    this.queryResourceIdleTimeout = options.queryResourceIdleTimeout ?? 30_000;
    this.queryResourceIdleIncludeEndpoint = options.queryResourceIdleIncludeEndpoint ?? false;
  }

  public override async run(context: ITaskContext): Promise<void> {
    // Start server
    const [ serverHandler, networkHandler ] = await this.startServer(context);

    // Setup SPARQL endpoint
    const network = networkHandler.network.id;
    const endpointProcessHandler = await this.hookSparqlEndpoint.start(context, { docker: { network }});

    const processHandler = new ProcessHandlerComposite([
      serverHandler,
      endpointProcessHandler,
      networkHandler,
    ]);
    const closeProcess = secureProcessHandler(processHandler, context);

    // Wait for the server to be fully available
    await this.waitForEndpoint(context);

    // Set up the query loader
    const queryLoader = new QueryLoaderFile({
      path: Path.join(context.experimentPaths.generated, 'out-queries'),
      extensions: [ '.sparql', '.rq' ],
    });

    // Set up per-query resource tracking
    const readers = await this.createResourceReaders(context, serverHandler, endpointProcessHandler);
    const metricKeys = Object.keys(readers).length > 0 ?
        [ ...getResourceMetricKeys(Object.keys(readers)), 'idleWaitTime', 'idleWaitTimedOut' ] :
        [];

    // Initiate SPARQL benchmark runner
    let stopStats: () => void;
    const runner = await this.createSparqlBenchmarkRunnerResourceTracking(queryLoader, readers, metricKeys);

    const results = await runner.runWithRawResults({
      async onStart() {
        // Collect stats
        stopStats = await processHandler.startCollectingStats();

        // Breakpoint right before starting queries.
        if (context.breakpointBarrier) {
          await context.breakpointBarrier();
        }
      },
      async onStop() {
        stopStats();
      },
    });

    // Write results
    const resultSerializer = new ResultSerializerCsv();
    const resultsOutput = context.experimentPaths.output;
    if (!await fs.pathExists(resultsOutput)) {
      await fs.mkdir(resultsOutput);
    }
    context.logger.info(`Writing results to ${resultsOutput}\n`);
    await resultSerializer.serialize(Path.join(resultsOutput, 'query-times.csv'), results.aggregateResults);

    if (results.rawResults) {
      if (metricKeys.length > 0) {
        await new ResultSerializerCsv().serialize(
          Path.join(resultsOutput, 'query-resources-raw.csv'),
          this.projectResourceResults(results.rawResults, metricKeys),
        );
      }

      const resultSerializerRaw: IResultSerializer = new ResultSerializerRaw();
      await resultSerializerRaw.serialize(Path.join(resultsOutput, 'query-results-raw.json'), results.rawResults);
    }

    // Close endpoint and server
    await closeProcess();
  }

  /**
   * Create resource readers for the server and endpoint containers.
   * Returns no readers if per-query resource tracking is disabled.
   * @param context The task context.
   * @param serverHandler The server container.
   * @param endpointHandler The SPARQL endpoint process, which is only tracked if it is a Docker container.
   */
  public async createResourceReaders(
    context: ITaskContext,
    serverHandler: ProcessHandler,
    endpointHandler: ProcessHandler,
  ): Promise<Record<string, IResourceReader>> {
    if (this.queryResourceSamplingInterval <= 0) {
      return {};
    }
    const warn = (message: string): void => {
      context.logger.warn(message);
    };
    const readers: Record<string, IResourceReader> = {};
    for (const [ key, handler ] of <[string, ProcessHandler][]> [
      [ 'server', serverHandler ],
      [ 'endpoint', endpointHandler ],
    ]) {
      const container = (<{ container?: IDockerContainerLike }> handler).container;
      if (container) {
        readers[key] = await createContainerResourceReader(container, warn);
      } else {
        warn(`Per-query resource tracking is skipped for the ${key}, as it does not run in a Docker container`);
      }
    }
    return readers;
  }

  protected async createSparqlBenchmarkRunnerResourceTracking(
    queryLoader: QueryLoaderFile,
    readers: Record<string, IResourceReader>,
    metricKeys: string[],
  ): Promise<SparqlBenchmarkRunnerResourceTracking> {
    const trackingEnabled = Object.keys(readers).length > 0;
    const idleReaders = Object.entries(readers)
      .filter(([ key ]) => key === 'server' || (key === 'endpoint' && this.queryResourceIdleIncludeEndpoint))
      .map(([ , reader ]) => reader);
    return new SparqlBenchmarkRunnerResourceTracking({
      endpoint: this.endpointUrl,
      querySets: await queryLoader.loadQueries(),
      replication: this.queryRunnerReplication,
      warmup: this.queryRunnerWarmupRounds,
      requestDelay: this.queryRunnerRequestDelay,
      availabilityCheckTimeout: this.queryRunnerEndpointAvailabilityCheckTimeout,
      logger: (message: string) => process.stderr.write(`${message}\n`),
      additionalUrlParams: new URLSearchParams(this.queryRunnerUrlParams),
      timeout: this.queryTimeoutFallback,
      resultAggregator: new ResultAggregatorResourceTracking(metricKeys),
      resourceTracker: trackingEnabled ?
        new ExecutionResourceTracker(readers, this.queryResourceSamplingInterval) :
        undefined,
      idleWaiter: idleReaders.length > 0 && this.queryResourceIdleWindows > 0 ?
        new ResourceIdleWaiter(idleReaders, {
          cpuThreshold: this.queryResourceIdleCpuThreshold,
          ioThreshold: this.queryResourceIdleIoThreshold,
          networkThreshold: this.queryResourceIdleNetworkThreshold,
          window: this.queryResourceIdleWindow,
          windows: this.queryResourceIdleWindows,
          timeout: this.queryResourceIdleTimeout,
        }) :
        undefined,
    });
  }

  /**
   * Reduce raw results to their resource-related fields, for compact per-execution output.
   * @param results Raw query execution results.
   * @param metricKeys The resource metric keys.
   */
  public projectResourceResults(results: IResult[], metricKeys: string[]): IResult[] {
    return results.map(result => <IResult> Object.fromEntries([
      'name',
      'id',
      'time',
      'results',
      'error',
      'executionStartTime',
      'executionEndTime',
      ...metricKeys,
    ].filter(key => key in result).map(key => [ key, result[key] ])));
  }
}

export interface IExperimentSolidBenchDerivedResourcesOptions extends IExperimentSolidBenchOptions {
  /**
   * Interval in milliseconds at which container resource usage is sampled during each query execution.
   * Set to 0 to disable per-query resource tracking (and idle waiting).
   * Defaults to 100.
   */
  queryResourceSamplingInterval?: number;
  /**
   * Maximum CPU usage (in cores) of the server for it to count as idle before a query execution.
   * Defaults to 0.05.
   */
  queryResourceIdleCpuThreshold?: number;
  /**
   * Maximum block I/O (in bytes per second) of the server for it to count as idle before a query execution.
   * Defaults to 100000.
   */
  queryResourceIdleIoThreshold?: number;
  /**
   * Maximum network traffic (in bytes per second) of the server for it to count as idle before a query execution.
   * Defaults to 10000.
   */
  queryResourceIdleNetworkThreshold?: number;
  /**
   * Length in milliseconds of a single idle check window.
   * Defaults to 250.
   */
  queryResourceIdleWindow?: number;
  /**
   * Number of consecutive idle windows required before a query execution.
   * Set to 0 to disable idle waiting.
   * Defaults to 2.
   */
  queryResourceIdleWindows?: number;
  /**
   * Maximum time in milliseconds to wait for idleness before executing a query anyway.
   * Defaults to 30000.
   */
  queryResourceIdleTimeout?: number;
  /**
   * If the SPARQL endpoint container must also be idle before a query execution.
   * Defaults to false.
   */
  queryResourceIdleIncludeEndpoint?: boolean;
}
