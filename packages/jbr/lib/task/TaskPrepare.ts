import * as fs from 'fs-extra';
import { ExperimentLoader } from './ExperimentLoader';
import type { ITaskContext } from './ITaskContext';

/**
 * Runs the preparation phase of an experiment.
 */
export class TaskPrepare {
  private readonly context: ITaskContext;
  private readonly forceOverwriteGenerated: boolean;
  private readonly combination: number | undefined;

  public constructor(
    context: ITaskContext,
    forceOverwriteGenerated: boolean,
    combination: number | undefined,
  ) {
    this.context = context;
    this.forceOverwriteGenerated = forceOverwriteGenerated;
    this.combination = combination;
  }

  public async prepare(): Promise<void> {
    // Remove hidden marker file if it exists
    const markerPath = ExperimentLoader.getPreparedMarkerPath(this.context.experimentPaths.root);
    if (await fs.pathExists(markerPath)) {
      await fs.unlink(markerPath);
    }

    // Run experiment's prepare logic
    const { experiments, experimentPathsArray, combinationProvider } = await (await ExperimentLoader
      .build(this.context.mainModulePath))
      .instantiateExperiments(this.context.experimentName, this.context.experimentPaths.root);
    for (const [ i, experiment ] of experiments.entries()) {
      if (this.combination === undefined || this.combination === i) {
        this.context.logger.info(`🧩 Preparing experiment combination ${i}`);

        await experiment.prepare(
          { ...this.context, experimentPaths: experimentPathsArray[i] },
          this.forceOverwriteGenerated,
        );
      }
    }

    // Create a hidden marker file in generate/ to indicate that this experiment has been successfully prepared
    await fs.writeFile(markerPath, '', 'utf8');
  }
}
