import type { ITaskContext, DockerResourceConstraints, ProcessHandler, Hook, IHookStartOptions, ICleanTargets } from 'jbr';
/**
 * A hook instance for a Comunica-based SPARQL endpoint.
 */
export declare class HookSparqlEndpointComunica implements Hook {
    readonly dockerfileClient: string;
    readonly resourceConstraints: DockerResourceConstraints;
    readonly configClient: string;
    readonly contextClient: string;
    readonly clientPort: number;
    readonly clientLogLevel: string;
    readonly queryTimeout: number;
    readonly maxMemory: number;
    constructor(dockerfileClient: string, resourceConstraints: DockerResourceConstraints, configClient: string, contextClient: string, clientPort: number, clientLogLevel: string, queryTimeout: number, maxMemory: number);
    getDockerImageName(context: ITaskContext): string;
    prepare(context: ITaskContext, forceOverwriteGenerated: boolean): Promise<void>;
    start(context: ITaskContext, options?: IHookStartOptions): Promise<ProcessHandler>;
    clean(context: ITaskContext, cleanTargets: ICleanTargets): Promise<void>;
}
