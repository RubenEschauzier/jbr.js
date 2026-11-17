import type { IResult } from 'sparql-benchmark-runner';
import { SparqlBenchmarkRunner } from 'sparql-benchmark-runner';
import type { ExecutionResourceTracker } from '../lib/ExecutionResourceTracker';
import type { ResourceIdleWaiter } from '../lib/ResourceIdleWaiter';
import { SparqlBenchmarkRunnerResourceTracking } from '../lib/SparqlBenchmarkRunnerResourceTracking';

describe('SparqlBenchmarkRunnerResourceTracking', () => {
  let baseResult: IResult;
  let executeQuery: jest.SpyInstance;
  let measurementStop: jest.Mock;
  let resourceTracker: ExecutionResourceTracker;
  let idleWaiter: ResourceIdleWaiter;
  let logger: jest.Mock;

  beforeEach(() => {
    baseResult = { name: 'q', id: '0', hash: 'H', results: 1, time: 5, timestamps: [ 5 ]};
    executeQuery = jest.spyOn(SparqlBenchmarkRunner.prototype, 'executeQuery')
      .mockImplementation(async() => ({ ...baseResult }));
    jest.spyOn(SparqlBenchmarkRunner.prototype, 'waitForEndpoint').mockResolvedValue();
    measurementStop = jest.fn(async() => ({ serverCpuAvg: 0.5 }));
    resourceTracker = <any> { start: jest.fn(async() => ({ stop: measurementStop })) };
    idleWaiter = <any> { waitForIdle: jest.fn(async() => ({ idleWaitTime: 100, idleWaitTimedOut: false })) };
    logger = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createRunner(extra: object): SparqlBenchmarkRunnerResourceTracking {
    return new SparqlBenchmarkRunnerResourceTracking({
      endpoint: 'http://localhost:3001/sparql',
      querySets: { q: [ 'SELECT * {}' ]},
      replication: 2,
      warmup: 1,
      logger,
      ...extra,
    });
  }

  it('should track resources and wait for idleness in measured executions only', async() => {
    const runner = createRunner({ resourceTracker, idleWaiter });
    const { rawResults } = await runner.runWithRawResults();

    // 1 warmup + 2 measured executions
    expect(executeQuery).toHaveBeenCalledTimes(3);
    expect(idleWaiter.waitForIdle).toHaveBeenCalledTimes(2);
    expect(resourceTracker.start).toHaveBeenCalledTimes(2);
    expect(measurementStop).toHaveBeenCalledTimes(2);
    expect(rawResults).toEqual([ 0, 1 ].map(() => ({
      ...baseResult,
      idleWaitTime: 100,
      idleWaitTimedOut: false,
      executionStartTime: expect.any(Number),
      executionEndTime: expect.any(Number),
      serverCpuAvg: 0.5,
    })));
    expect(rawResults![0].executionEndTime).toBeGreaterThanOrEqual(rawResults![0].executionStartTime);
  });

  it('should log when the idle wait times out', async() => {
    jest.spyOn(idleWaiter, 'waitForIdle')
      .mockImplementation(async() => ({ idleWaitTime: 30_000, idleWaitTimedOut: true }));
    const runner = createRunner({ idleWaiter, warmup: 0, replication: 1 });
    const result = await runner.executeQuery('q', '0', 'SELECT * {}');

    expect(result.idleWaitTimedOut).toBe(true);
    expect(logger).toHaveBeenCalledWith(
      'Warning: containers did not become idle within 30000 ms before <q#0>, executing anyway',
    );
  });

  it('should only add timestamps without tracker and idle waiter', async() => {
    const runner = createRunner({});
    const result = await runner.executeQuery('q', '0', 'SELECT * {}');

    expect(result).toEqual({
      ...baseResult,
      executionStartTime: expect.any(Number),
      executionEndTime: expect.any(Number),
    });
  });

  it('should reset the warmup flag when executions fail', async() => {
    executeQuery.mockRejectedValueOnce(new Error('failure'));
    const runner = createRunner({ resourceTracker });
    await expect(runner.executeAllQueries(1, true)).rejects.toThrow('failure');

    await runner.executeQuery('q', '0', 'SELECT * {}');
    expect(resourceTracker.start).toHaveBeenCalledTimes(1);
  });
});
