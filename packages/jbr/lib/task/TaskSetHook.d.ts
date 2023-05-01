import type { NpmInstaller } from '../npm/NpmInstaller';
import type { ITaskContext } from './ITaskContext';
/**
 * Sets a handler for a given experiment's hook
 */
export declare class TaskSetHook {
    private readonly context;
    private readonly hookPathName;
    private readonly handlerTypeId;
    private readonly npmInstaller;
    constructor(context: ITaskContext, hookPathName: string[], handlerTypeId: string, npmInstaller: NpmInstaller);
    set(): Promise<ITaskSetHookOutput>;
    static getObjectPath(configPath: string, object: any, path: string[]): any;
    static setObjectPath(configPath: string, object: any, path: string[], value: any): void;
}
export interface ITaskSetHookOutput {
    subHookNames: string[];
}
