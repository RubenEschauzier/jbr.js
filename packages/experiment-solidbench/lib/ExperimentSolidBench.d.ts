import type { Experiment, Hook, ITaskContext, DockerResourceConstraints, ICleanTargets, DockerContainerHandler, DockerNetworkHandler } from 'jbr';
/**
 * An experiment instance for the SolidBench social network benchmark.
 */
export declare class ExperimentSolidBench implements Experiment {
    readonly scale: string;
    readonly configGenerateAux: string;
    readonly configFragment: string;
    readonly configFragmentAux: string;
    readonly configQueries: string;
    readonly configServer: string;
    readonly validationParamsUrl: string;
    readonly configValidation: string;
    readonly hadoopMemory: string;
    readonly dockerfileServer: string;
    readonly hookSparqlEndpoint: Hook;
    readonly serverPort: number;
    readonly serverLogLevel: string;
    readonly serverBaseUrl: string;
    readonly serverResourceConstraints: DockerResourceConstraints;
    readonly endpointUrl: string;
    readonly queryRunnerReplication: number;
    readonly queryRunnerWarmupRounds: number;
    readonly queryRunnerRecordTimestamps: boolean;
    readonly queryRunnerRecordHttpRequests: boolean;
    readonly queryRunnerUpQuery: string;
    readonly queryRunnerUrlParamsInit: Record<string, any>;
    readonly queryRunnerUrlParamsRun: Record<string, any>;
    readonly queryTimeoutFallback: number | undefined;
    /**
     * @param scale
     * @param configGenerateAux
     * @param configFragment
     * @param configFragmentAux
     * @param configQueries
     * @param configServer
     * @param validationParamsUrl
     * @param configValidation
     * @param hadoopMemory
     * @param dockerfileServer
     * @param hookSparqlEndpoint
     * @param serverPort
     * @param serverLogLevel
     * @param serverBaseUrl
     * @param serverResourceConstraints
     * @param endpointUrl
     * @param queryRunnerReplication
     * @param queryRunnerWarmupRounds
     * @param queryRunnerRecordTimestamps
     * @param queryRunnerRecordHttpRequests
     * @param queryRunnerUpQuery
     * @param queryRunnerUrlParamsInit - @range {json}
     * @param queryRunnerUrlParamsRun - @range {json}
     * @param queryTimeoutFallback
     */
    constructor(scale: string, configGenerateAux: string, configFragment: string, configFragmentAux: string, configQueries: string, configServer: string, validationParamsUrl: string, configValidation: string, hadoopMemory: string, dockerfileServer: string, hookSparqlEndpoint: Hook, serverPort: number, serverLogLevel: string, serverBaseUrl: string, serverResourceConstraints: DockerResourceConstraints, endpointUrl: string, queryRunnerReplication: number, queryRunnerWarmupRounds: number, queryRunnerRecordTimestamps: boolean, queryRunnerRecordHttpRequests: boolean, queryRunnerUpQuery: string, queryRunnerUrlParamsInit: Record<string, any>, queryRunnerUrlParamsRun: Record<string, any>, queryTimeoutFallback: number | undefined);
    getDockerImageName(context: ITaskContext, type: string): string;
    replaceBaseUrlInDir(path: string): Promise<void>;
    prepare(context: ITaskContext, forceOverwriteGenerated: boolean): Promise<void>;
    run(context: ITaskContext): Promise<void>;
    startServer(context: ITaskContext): Promise<[DockerContainerHandler, DockerNetworkHandler]>;
    clean(context: ITaskContext, cleanTargets: ICleanTargets): Promise<void>;
}
