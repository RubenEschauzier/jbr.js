import type { Logger } from 'winston';
import type { NpmInstaller } from '../../lib/npm/NpmInstaller';
import type { IExperimentPaths, ITaskContext } from '../task/ITaskContext';
export declare function createExperimentPaths(basePath: string, combination?: number): IExperimentPaths;
export declare function breakpointBarrier(): Promise<void>;
export declare function wrapCommandHandler(argv: Record<string, any>, handler: (context: ITaskContext) => Promise<void>): Promise<void>;
export declare function wrapVisualProgress<T>(label: string, handler: () => Promise<T>): Promise<T>;
export declare function createCliLogger(logLevel: string): Logger;
export declare function createNpmInstaller(context: ITaskContext, nextVersion: boolean): Promise<NpmInstaller>;
