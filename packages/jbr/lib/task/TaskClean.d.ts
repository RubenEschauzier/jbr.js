import type { ICleanTargets } from './ICleanTargets';
import type { ITaskContext } from './ITaskContext';
/**
 * Cleans an experiment.
 */
export declare class TaskClean {
    private readonly context;
    private readonly cleanTargets;
    constructor(context: ITaskContext, cleanTargets: ICleanTargets);
    clean(): Promise<void>;
}
