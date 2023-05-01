import type { NpmInstaller } from '../npm/NpmInstaller';
import type { ITaskContext } from './ITaskContext';
/**
 * Initializes an experiment of the given type.
 */
export declare class TaskInitialize {
    static readonly INIT_DIRS: string[];
    private readonly context;
    private readonly experimentTypeId;
    private readonly experimentName;
    private readonly targetDirectory;
    private readonly forceReInit;
    private readonly combinations;
    private readonly npmInstaller;
    constructor(context: ITaskContext, experimentTypeId: string, experimentName: string, targetDirectory: string, forceReInit: boolean, combinations: boolean, npmInstaller: NpmInstaller);
    init(): Promise<ITaskInitializeOutput>;
}
export interface ITaskInitializeOutput {
    experimentDirectory: string;
    hookNames: string[];
}
