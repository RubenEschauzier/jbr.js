import type { IExperimentSolidBenchOptions } from '@jbr-experiment/solidbench';
import { ExperimentSolidBench } from '@jbr-experiment/solidbench';

/**
 * An experiment instance for the SolidBench social network benchmark,
 * fragmented into pods that expose derived resources.
 */
export class ExperimentSolidBenchDerivedResources extends ExperimentSolidBench {
  public constructor(options: IExperimentSolidBenchOptions) {
    super(options);
  }
}
