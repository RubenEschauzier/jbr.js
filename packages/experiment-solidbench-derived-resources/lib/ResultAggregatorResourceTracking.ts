import type { IAggregateResult, IResult } from 'sparql-benchmark-runner';
import { ResultAggregatorComunica } from 'sparql-benchmark-runner';

/**
 * A result aggregator that additionally aggregates per-execution resource metrics across replications.
 *
 * Only successful executions are considered, consistent with how query times are aggregated.
 * For every numeric metric key:
 * - keys ending in 'Min' take the minimum over executions,
 * - keys ending in 'Max' take the maximum over executions,
 * - all other keys take the mean over executions, with the standard deviation in '<key>Std'.
 * For every boolean metric key, the number of executions where it is true is stored in '<key>Count'.
 */
export class ResultAggregatorResourceTracking extends ResultAggregatorComunica {
  public constructor(public readonly metricKeys: string[]) {
    super();
  }

  public override aggregateResults(results: IResult[]): IAggregateResult[] {
    const aggregateResults = super.aggregateResults(results);
    const groupedResults = this.groupResults(results);
    for (const aggregate of aggregateResults) {
      const successful = groupedResults[`${aggregate.name}:${aggregate.id}`].filter(result => !result.error);
      for (const key of this.metricKeys) {
        Object.assign(aggregate, this.aggregateMetric(key, successful.map((result): unknown => result[key])));
      }
    }
    return aggregateResults;
  }

  /**
   * Aggregate the values of a single metric.
   * @param key The metric key.
   * @param values The values of the metric over all successful executions.
   */
  public aggregateMetric(key: string, values: unknown[]): Record<string, number> {
    const booleans = values.filter((value): value is boolean => typeof value === 'boolean');
    if (booleans.length > 0) {
      return { [`${key}Count`]: booleans.filter(Boolean).length };
    }

    const numbers = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
    if (numbers.length === 0) {
      return {};
    }
    if (key.endsWith('Min')) {
      return { [key]: Math.min(...numbers) };
    }
    if (key.endsWith('Max')) {
      return { [key]: Math.max(...numbers) };
    }
    const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    const variance = numbers.reduce((sum, value) => sum + (value - mean) ** 2, 0) / numbers.length;
    return { [key]: mean, [`${key}Std`]: Math.sqrt(variance) };
  }
}
