import type { IExperimentPaths } from 'jbr';
import { ExperimentHandler } from 'jbr';
import { ExperimentWatDiv } from './ExperimentWatDiv';
/**
 * An experiment handler for the LDBC SNB Decentralized benchmark.
 */
export declare class ExperimentHandlerWatDiv extends ExperimentHandler<ExperimentWatDiv> {
    constructor();
    getDefaultParams(experimentPaths: IExperimentPaths): Record<string, any>;
    getHookNames(): string[];
    init(experimentPaths: IExperimentPaths, experiment: ExperimentWatDiv): Promise<void>;
}
