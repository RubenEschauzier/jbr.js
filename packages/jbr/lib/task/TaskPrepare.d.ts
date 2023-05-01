import type { ITaskContext } from './ITaskContext';
/**
 * Runs the preparation phase of an experiment.
 */
export declare class TaskPrepare {
    private readonly context;
    private readonly forceOverwriteGenerated;
    private readonly combination;
    constructor(context: ITaskContext, forceOverwriteGenerated: boolean, combination: number | undefined);
    prepare(): Promise<void>;
}
