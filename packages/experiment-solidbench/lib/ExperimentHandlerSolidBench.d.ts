import type { IExperimentPaths } from 'jbr';
import { ExperimentHandler } from 'jbr';
import { ExperimentSolidBench } from './ExperimentSolidBench';
/**
 * An experiment handler for the SolidBench social network benchmark.
 */
export declare class ExperimentHandlerSolidBench extends ExperimentHandler<ExperimentSolidBench> {
    constructor();
    getDefaultParams(experimentPaths: IExperimentPaths): Record<string, any>;
    getHookNames(): string[];
    init(experimentPaths: IExperimentPaths, experiment: ExperimentSolidBench): Promise<void>;
}
