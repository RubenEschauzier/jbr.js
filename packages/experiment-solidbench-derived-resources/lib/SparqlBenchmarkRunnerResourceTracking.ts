import type { IResult, ISparqlBenchmarkRunnerArgs } from 'sparql-benchmark-runner';
import { SparqlBenchmarkRunner } from 'sparql-benchmark-runner';
import type { ExecutionResourceTracker } from './ExecutionResourceTracker';
import type { ResourceIdleWaiter } from './ResourceIdleWaiter';

export interface ISparqlBenchmarkRunnerResourceTrackingArgs extends ISparqlBenchmarkRunnerArgs {
  /**
   * Measures container resource usage during each (non-warmup) query execution.
   */
  resourceTracker?: ExecutionResourceTracker;
  /**
   * Waits until containers are idle before each (non-warmup) query execution.
   */
  idleWaiter?: ResourceIdleWaiter;
}

/**
 * A SPARQL benchmark runner that measures container resource usage for every individual query execution.
 *
 * Before each measured execution, it optionally waits until the containers are idle,
 * so that leftover work of a previous execution does not leak into the measurement.
 * Warmup executions are neither tracked nor delayed.
 */
export class SparqlBenchmarkRunnerResourceTracking extends SparqlBenchmarkRunner {
  protected readonly resourceTracker?: ExecutionResourceTracker;
  protected readonly idleWaiter?: ResourceIdleWaiter;
  protected warmupActive = false;

  public constructor(options: ISparqlBenchmarkRunnerResourceTrackingArgs) {
    super(options);
    this.resourceTracker = options.resourceTracker;
    this.idleWaiter = options.idleWaiter;
  }

  public override async executeAllQueries(
    replication: number,
    warmup: boolean,
    onQuery?: (queryString: string) => Promise<void>,
  ): Promise<IResult[]> {
    this.warmupActive = warmup;
    try {
      return await super.executeAllQueries(replication, warmup, onQuery);
    } finally {
      this.warmupActive = false;
    }
  }

  public override async executeQuery(name: string, id: string, queryString: string): Promise<IResult> {
    if (this.warmupActive) {
      return super.executeQuery(name, id, queryString);
    }

    let idleMetrics = {};
    if (this.idleWaiter) {
      const idleResult = await this.idleWaiter.waitForIdle();
      if (idleResult.idleWaitTimedOut) {
        this.log(`Warning: containers did not become idle within ${idleResult.idleWaitTime} ms before <${name}#${id}>, executing anyway`);
      }
      idleMetrics = idleResult;
    }

    const measurement = await this.resourceTracker?.start();
    const executionStartTime = Date.now();
    const result = await super.executeQuery(name, id, queryString);
    const executionEndTime = Date.now();
    const resourceMetrics = measurement ? await measurement.stop() : {};

    return {
      ...result,
      ...idleMetrics,
      executionStartTime,
      executionEndTime,
      ...resourceMetrics,
    };
  }
}
