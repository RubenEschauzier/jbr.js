import type { ITaskContext } from './ITaskContext';
/**
 * Validates an experiment.
 */
export declare class TaskValidate {
    static readonly REQUIRED_FILES: string[];
    static readonly REQUIRED_FILES_COMBINATIONS: string[];
    private readonly context;
    constructor(context: ITaskContext);
    validate(): Promise<void>;
}
