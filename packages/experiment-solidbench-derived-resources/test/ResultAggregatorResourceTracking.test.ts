import type { IResult } from 'sparql-benchmark-runner';
import { ResultAggregatorResourceTracking } from '../lib/ResultAggregatorResourceTracking';

function result(id: string, metrics: Record<string, unknown>, error?: Error): IResult {
  return { name: 'q', id, hash: 'H', results: 1, time: 10, timestamps: [ 10 ], error, ...metrics };
}

describe('ResultAggregatorResourceTracking', () => {
  const keys = [ 'serverCpuAvg', 'serverCpuMin', 'serverCpuMax', 'serverMemoryTotalMax', 'idleWaitTimedOut' ];
  const aggregator = new ResultAggregatorResourceTracking(keys);

  it('should aggregate metrics over successful executions per query', () => {
    const aggregates = aggregator.aggregateResults([
      result('0', {
        serverCpuAvg: 1,
        serverCpuMin: 0.5,
        serverCpuMax: 2,
        serverMemoryTotalMax: 10,
        idleWaitTimedOut: false,
      }),
      result('0', {
        serverCpuAvg: 3,
        serverCpuMin: 0.2,
        serverCpuMax: 4,
        serverMemoryTotalMax: 30,
        idleWaitTimedOut: true,
      }),
      result('0', {
        serverCpuAvg: 100,
        serverCpuMin: 0,
        serverCpuMax: 100,
        serverMemoryTotalMax: 1_000,
      }, new Error('timeout')),
      result('1', { serverCpuAvg: 5 }),
    ]);

    expect(aggregates).toHaveLength(2);
    expect(aggregates[0]).toMatchObject({
      id: '0',
      serverCpuAvg: 2,
      serverCpuAvgStd: 1,
      serverCpuMin: 0.2,
      serverCpuMax: 4,
      serverMemoryTotalMax: 30,
      idleWaitTimedOutCount: 1,
      // Standard aggregation still works
      time: 10,
      failures: 1,
    });
    expect(aggregates[1]).toMatchObject({ id: '1', serverCpuAvg: 5, serverCpuAvgStd: 0 });
    expect(aggregates[1]).not.toHaveProperty('serverCpuMin');
    expect(aggregates[1]).not.toHaveProperty('idleWaitTimedOutCount');
  });

  it('should not add metrics when all executions failed', () => {
    const aggregates = aggregator.aggregateResults([
      result('0', { serverCpuAvg: 1 }, new Error('timeout')),
    ]);
    expect(aggregates[0]).not.toHaveProperty('serverCpuAvg');
  });

  it('should ignore NaN values', () => {
    expect(aggregator.aggregateMetric('x', [ Number.NaN, 4, undefined ])).toEqual({ x: 4, xStd: 0 });
  });
});
