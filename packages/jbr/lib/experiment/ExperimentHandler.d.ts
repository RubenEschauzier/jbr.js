import type { IExperimentPaths } from '../task/ITaskContext';
import type { Experiment } from './Experiment';
/**
 * Handler for a certain type of experiment.
 */
export declare abstract class ExperimentHandler<E extends Experiment> {
    /**
     * Unique id of this experiment type.
     */
    readonly id: string;
    /**
     * Name of the experiment class.
     * This will be used to initialize config files.
     */
    readonly experimentClassName: string;
    constructor(id: string, experimentClassName: string);
    /**
     * Default parameters that should be added to the 'jbr-experiment.json' file during initialization.
     * These should correspond to all (required) Components.js parameters for instantiating an experiment.
     * @param experimentPaths The experiment directories. (guaranteed to exists)
     */
    abstract getDefaultParams(experimentPaths: IExperimentPaths): Record<string, any>;
    /**
     * Names of possible hooks into the experiment.
     */
    abstract getHookNames(): string[];
    /**
     * Called upon initializing a new experiment.
     * @param experimentPaths The experiment directories. (guaranteed to exists)
     * @param experiment The experiment instance.
     */
    abstract init(experimentPaths: IExperimentPaths, experiment: E): Promise<void>;
}
