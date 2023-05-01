import type { ITaskContext } from './ITaskContext';
/**
 * Archives an experiment.
 */
export declare class TaskPack {
    private readonly context;
    private readonly outputName?;
    constructor(context: ITaskContext, outputName?: string);
    pack(): Promise<void>;
}
