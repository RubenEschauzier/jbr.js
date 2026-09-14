import * as Path from 'node:path';
import { ExperimentHandlerSolidBench } from '@jbr-experiment/solidbench';
import { Templates } from 'solidbench';
import { ExperimentSolidBenchDerivedResources } from './ExperimentSolidBenchDerivedResources';

/**
 * An experiment handler for the SolidBench social network benchmark (derived resources variant).
 */
export class ExperimentHandlerSolidBenchDerivedResources
  extends ExperimentHandlerSolidBench<ExperimentSolidBenchDerivedResources> {
  public constructor() {
    super('solidbench-derived-resources', ExperimentSolidBenchDerivedResources.name);
  }

  protected override getTemplates(): Record<'enhance' | 'fragment' | 'queries', string> {
    return {
      enhance: Templates.ENHANCEMENT_CONFIG,
      fragment: Templates.FRAGMENT_CONFIG_DERIVED,
      queries: Templates.QUERY_CONFIG,
    };
  }

  protected override getDockerfilePath(): string {
    // Resolve the root of the parent package and point to its template directory
    const parentPackagePath = Path.dirname(require.resolve('@jbr-experiment/solidbench/package.json'));
    return Path.join(parentPackagePath, 'lib', 'templates', 'dockerfiles', 'Dockerfile-server');
  }
}
