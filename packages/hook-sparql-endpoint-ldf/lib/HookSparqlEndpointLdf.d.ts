import type { ITaskContext, DockerResourceConstraints, ProcessHandler, Hook, IHookStartOptions, ICleanTargets } from 'jbr';
/**
 * A hook instance for a LDF server-based SPARQL endpoint.
 */
export declare class HookSparqlEndpointLdf implements Hook {
    readonly dockerfile: string;
    readonly dockerfileCache: string;
    readonly resourceConstraints: DockerResourceConstraints;
    readonly config: string;
    readonly portServer: number;
    readonly portCache: number;
    readonly workers: number;
    readonly maxMemory: number;
    readonly dataset: string;
    readonly hookSparqlEndpointLdfEngine: Hook;
    constructor(dockerfile: string, dockerfileCache: string, resourceConstraints: DockerResourceConstraints, config: string, portServer: number, portCache: number, workers: number, maxMemory: number, dataset: string, hookSparqlEndpointLdfEngine: Hook);
    getDockerImageName(context: ITaskContext, type: string): string;
    prepare(context: ITaskContext, forceOverwriteGenerated: boolean): Promise<void>;
    start(context: ITaskContext, options?: IHookStartOptions): Promise<ProcessHandler>;
    clean(context: ITaskContext, cleanTargets: ICleanTargets): Promise<void>;
}
