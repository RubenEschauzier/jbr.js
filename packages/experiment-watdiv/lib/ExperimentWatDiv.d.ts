import type { Experiment, Hook, ICleanTargets, ITaskContext } from 'jbr';
/**
 * An experiment instance for the LDBC SNB Decentralized benchmark.
 */
export declare class ExperimentWatDiv implements Experiment {
    static readonly DOCKER_IMAGE_WATDIV = "comunica/watdiv@sha256:2fac67737d6dddd75ea023b90bba2a1c7432a00e233791a802e374e3d2a8ec3b";
    static readonly DOCKER_IMAGE_HDT = "rdfhdt/hdt-cpp:v1.3.3";
    readonly datasetScale: number;
    readonly queryCount: number;
    readonly queryRecurrence: number;
    readonly generateHdt: boolean;
    readonly hookSparqlEndpoint: Hook;
    readonly endpointUrl: string;
    readonly queryRunnerReplication: number;
    readonly queryRunnerWarmupRounds: number;
    readonly queryRunnerRecordTimestamps: boolean;
    readonly queryRunnerRecordHttpRequests: boolean;
    readonly queryRunnerUrlParamsInit: Record<string, any>;
    readonly queryRunnerUrlParamsRun: Record<string, any>;
    readonly queryTimeoutFallback: number | undefined;
    /**
     * @param datasetScale
     * @param queryCount
     * @param queryRecurrence
     * @param generateHdt
     * @param hookSparqlEndpoint
     * @param endpointUrl
     * @param queryRunnerReplication
     * @param queryRunnerWarmupRounds
     * @param queryRunnerRecordTimestamps
     * @param queryRunnerRecordHttpRequests
     * @param queryRunnerUrlParamsInit - @range {json}
     * @param queryRunnerUrlParamsRun - @range {json}
     * @param queryTimeoutFallback
     */
    constructor(datasetScale: number, queryCount: number, queryRecurrence: number, generateHdt: boolean, hookSparqlEndpoint: Hook, endpointUrl: string, queryRunnerReplication: number, queryRunnerWarmupRounds: number, queryRunnerRecordTimestamps: boolean, queryRunnerRecordHttpRequests: boolean, queryRunnerUrlParamsInit: Record<string, any>, queryRunnerUrlParamsRun: Record<string, any>, queryTimeoutFallback: number | undefined);
    prepare(context: ITaskContext, forceOverwriteGenerated: boolean): Promise<void>;
    run(context: ITaskContext): Promise<void>;
    clean(context: ITaskContext, cleanTargets: ICleanTargets): Promise<void>;
}
