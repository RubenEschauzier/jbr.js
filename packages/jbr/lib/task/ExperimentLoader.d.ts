import { ComponentsManager } from 'componentsjs';
import type { CombinationProvider } from '../..';
import type { Experiment } from '../experiment/Experiment';
import type { ExperimentHandler } from '../experiment/ExperimentHandler';
import type { HookHandler } from '../hook/HookHandler';
import type { IExperimentPaths } from './ITaskContext';
/**
 * Loads and instantiates an experiment by config.
 */
export declare class ExperimentLoader {
    static readonly CONFIG_NAME = "jbr-experiment.json";
    static readonly CONFIG_TEMPLATE_NAME = "jbr-experiment.json.template";
    static readonly COMBINATIONS_NAME = "jbr-combinations.json";
    static readonly PACKAGEJSON_NAME = "package.json";
    static readonly PREPAREDMARKER_PATH: string[];
    static readonly IRI_EXPERIMENT_HANDLER = "https://linkedsoftwaredependencies.org/bundles/npm/jbr/^2.0.0/components/experiment/ExperimentHandler.jsonld#ExperimentHandler";
    static readonly IRI_HOOK_HANDLER = "https://linkedsoftwaredependencies.org/bundles/npm/jbr/^2.0.0/components/hook/HookHandler.jsonld#HookHandler";
    private readonly componentsManager;
    constructor(componentsManager: ComponentsManager<any>);
    /**
     * Create a new ExperimentLoader based on the given main module path.
     * @param mainModulePath Path from which dependencies should be searched for.
     *                       Typically the path of the current package.
     */
    static build<T>(mainModulePath: string): Promise<ExperimentLoader>;
    static getExperimentName(experimentRoot: string): Promise<string>;
    static buildComponentsManager<T>(mainModulePath: string): Promise<ComponentsManager<T>>;
    static getDefaultExperimentIri(experimentName: string): string;
    /**
     * Instantiate experiments from the given experiment path.
     * @param experimentName The name of the experiment.
     * @param experimentPath Path to an experiment directory.
     */
    instantiateExperiments(experimentName: string, experimentPath: string): Promise<{
        experiments: Experiment[];
        experimentPathsArray: IExperimentPaths[];
        combinationProvider?: CombinationProvider;
    }>;
    /**
     * Instantiate an experiment combinations provider from the given experiment path.
     * @param experimentName The name of the experiment.
     * @param experimentPath Path to an experiment directory.
     */
    instantiateCombinationProvider(experimentName: string, experimentPath: string): Promise<CombinationProvider>;
    /**
     * Instantiate an experiment from the given config file.
     * @param configPath Path to an experiment configuration file.
     * @param experimentIri IRI of the experiment to instantiate.
     */
    instantiateFromConfig<E>(configPath: string, experimentIri: string): Promise<E>;
    protected discoverComponents<C extends {
        id: string;
    }>(componentType: string): Promise<Record<string, {
        handler: C;
        contexts: string[];
    }>>;
    discoverExperimentHandlers(): Promise<Record<string, {
        handler: ExperimentHandler<any>;
        contexts: string[];
    }>>;
    discoverHookHandlers(): Promise<Record<string, {
        handler: HookHandler<any>;
        contexts: string[];
    }>>;
    /**
     * Get the path of the prepared marker file.
     * @param experimentPath Path of an experiment.
     */
    static getPreparedMarkerPath(experimentPath: string): string;
    /**
     * Check if the given experiment contains the prepared marker file.
     * @param experimentPath Path of an experiment.
     */
    static isExperimentPrepared(experimentPath: string): Promise<boolean>;
    /**
     * Throw an error if the given experiment does not contain the prepared marker file.
     * @param experimentPath Path of an experiment.
     */
    static requireExperimentPrepared(experimentPath: string): Promise<void>;
    /**
     * Check if the given experiment path is a combinations-based experiment.
     * @param experimentPath Path of an experiment.
     * @throws if the combinations-based experiment is invalid.
     */
    static isCombinationsExperiment(experimentPath: string): Promise<boolean>;
    /**
     * Throw an error if the given experiment is not a combinations-based experiment.
     * @param experimentPath Path of an experiment.
     */
    static requireCombinationsExperiment(experimentPath: string): Promise<void>;
    /**
     * Convert a given numerical combination id to a string-based id.
     * @param combinationId A numerical combination id.
     */
    static getCombinationIdString(combinationId: number): string;
    /**
     * Determine the IRI of a combination
     * @param experimentIri An experiment IRI.
     * @param combinationIdString A combination id.
     */
    static getCombinationExperimentIri(experimentIri: string, combinationIdString: string): string;
}
