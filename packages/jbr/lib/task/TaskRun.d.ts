import type { ITaskContext } from './ITaskContext';
/**
 * Runs the run phase of an experiment.
 */
export declare class TaskRun {
    private readonly context;
    private readonly combination;
    constructor(context: ITaskContext, combination: number | undefined);
    run(): Promise<void>;
}
