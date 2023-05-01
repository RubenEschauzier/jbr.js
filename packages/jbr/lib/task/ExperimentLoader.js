"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperimentLoader = void 0;
const Path = __importStar(require("path"));
const componentsjs_1 = require("componentsjs");
const GenericsContext_1 = require("componentsjs/lib/preprocess/GenericsContext");
const ParameterPropertyHandlerRange_1 = require("componentsjs/lib/preprocess/parameterproperty/ParameterPropertyHandlerRange");
const fs = __importStar(require("fs-extra"));
const CliHelpers_1 = require("../cli/CliHelpers");
const ErrorHandled_1 = require("../cli/ErrorHandled");
/**
 * Loads and instantiates an experiment by config.
 */
class ExperimentLoader {
    constructor(componentsManager) {
        this.componentsManager = componentsManager;
    }
    /**
     * Create a new ExperimentLoader based on the given main module path.
     * @param mainModulePath Path from which dependencies should be searched for.
     *                       Typically the path of the current package.
     */
    static async build(mainModulePath) {
        return new ExperimentLoader(await ExperimentLoader.buildComponentsManager(mainModulePath));
    }
    static async getExperimentName(experimentRoot) {
        try {
            const data = JSON.parse(await fs.readFile(Path.join(experimentRoot, 'package.json'), 'utf8'));
            return data.name;
        }
        catch (_a) {
            return 'dummy';
        }
    }
    static async buildComponentsManager(mainModulePath) {
        return await componentsjs_1.ComponentsManager.build({
            mainModulePath,
            skipContextValidation: true,
            logLevel: 'warn',
        });
    }
    static getDefaultExperimentIri(experimentName) {
        return `urn:jbr:${experimentName}`;
    }
    /**
     * Instantiate experiments from the given experiment path.
     * @param experimentName The name of the experiment.
     * @param experimentPath Path to an experiment directory.
     */
    async instantiateExperiments(experimentName, experimentPath) {
        // Determine experiment name and IRI
        const experimentIri = ExperimentLoader.getDefaultExperimentIri(experimentName);
        // Check if combinations file exists
        const configs = [];
        const experimentPathsArray = [];
        let combinationProvider;
        if (await ExperimentLoader.isCombinationsExperiment(experimentPath)) {
            // Determine combinations
            combinationProvider = await this.instantiateCombinationProvider(experimentName, experimentPath);
            const combinations = combinationProvider.getFactorCombinations();
            const combinationsPath = Path.join(experimentPath, 'combinations');
            for (const [combinationId] of combinations.entries()) {
                // Validate combination
                const combinationIdString = ExperimentLoader.getCombinationIdString(combinationId);
                const combinationInstancePath = Path.join(combinationsPath, combinationIdString);
                if (!await fs.pathExists(combinationInstancePath)) {
                    throw new ErrorHandled_1.ErrorHandled(`Detected invalid combination-based experiment. It is required to (re-)run 'jbr generate-combinations' first.`);
                }
                // Determine config file
                const combinationInstanceConfigPath = Path.join(combinationInstancePath, ExperimentLoader.CONFIG_NAME);
                configs.push({
                    iri: ExperimentLoader.getCombinationExperimentIri(experimentIri, combinationIdString),
                    path: combinationInstanceConfigPath,
                });
                const experimentPaths = (0, CliHelpers_1.createExperimentPaths)(combinationInstancePath, combinationId);
                if (combinationProvider.commonGenerated) {
                    experimentPaths.generated = Path.join(experimentPath, 'generated');
                }
                experimentPathsArray.push(experimentPaths);
            }
        }
        else {
            // Determine config file
            configs.push({
                iri: experimentIri,
                path: Path.join(experimentPath, ExperimentLoader.CONFIG_NAME),
            });
            experimentPathsArray.push((0, CliHelpers_1.createExperimentPaths)(experimentPath));
        }
        // Check if config exists
        for (const config of configs) {
            if (!await fs.pathExists(config.path)) {
                throw new Error(`Experiment config file could not be found at '${config.path}'`);
            }
        }
        // Instantiate valid config
        return {
            experiments: await Promise.all(configs
                .map(config => this.instantiateFromConfig(config.path, config.iri))),
            experimentPathsArray,
            combinationProvider,
        };
    }
    /**
     * Instantiate an experiment combinations provider from the given experiment path.
     * @param experimentName The name of the experiment.
     * @param experimentPath Path to an experiment directory.
     */
    async instantiateCombinationProvider(experimentName, experimentPath) {
        // Determine combinations name and IRI
        const experimentIri = ExperimentLoader.getDefaultExperimentIri(experimentName);
        const combinationsPath = Path.join(experimentPath, ExperimentLoader.COMBINATIONS_NAME);
        const combinationsIri = `${experimentIri}-combinations`;
        return await this.instantiateFromConfig(combinationsPath, combinationsIri);
    }
    /**
     * Instantiate an experiment from the given config file.
     * @param configPath Path to an experiment configuration file.
     * @param experimentIri IRI of the experiment to instantiate.
     */
    async instantiateFromConfig(configPath, experimentIri) {
        await this.componentsManager.configRegistry.register(configPath);
        return await this.componentsManager.instantiate(experimentIri);
    }
    async discoverComponents(componentType) {
        // Index available package.json by package name
        const packageJsons = {};
        for (const [path, packageJson] of Object.entries(this.componentsManager.moduleState.packageJsons)) {
            packageJsons[packageJson.name] = { contents: packageJson, path };
        }
        const rangeHandler = new ParameterPropertyHandlerRange_1.ParameterPropertyHandlerRange(this.componentsManager.objectLoader, false);
        // Collect and instantiate all available experiment handlers
        const handlers = {};
        for (const component of Object.values(this.componentsManager.componentResources)) {
            const hasTypeError = rangeHandler.hasType(component, this.componentsManager.objectLoader.createCompactedResource(componentType), new GenericsContext_1.GenericsContext(this.componentsManager.objectLoader, []), undefined, [], {});
            if (!hasTypeError && component.value !== componentType) {
                const handler = await this.componentsManager.configConstructorPool
                    .instantiate(this.componentsManager.objectLoader.createCompactedResource({
                    types: component,
                }), {});
                if (handlers[handler.id]) {
                    throw new Error(`Double registration of component id '${handler.id}' detected`);
                }
                // Determine contexts for this component's module
                const packageName = component.property.module.property.requireName.value;
                const packageJson = packageJsons[packageName];
                if (!packageJson) {
                    throw new ErrorHandled_1.ErrorHandled(`Could not find a package.json for '${packageName}'`);
                }
                const contexts = Object.keys(packageJson.contents['lsd:contexts']);
                handlers[handler.id] = { handler, contexts };
            }
        }
        return handlers;
    }
    discoverExperimentHandlers() {
        return this.discoverComponents(ExperimentLoader.IRI_EXPERIMENT_HANDLER);
    }
    discoverHookHandlers() {
        return this.discoverComponents(ExperimentLoader.IRI_HOOK_HANDLER);
    }
    /**
     * Get the path of the prepared marker file.
     * @param experimentPath Path of an experiment.
     */
    static getPreparedMarkerPath(experimentPath) {
        return Path.join(experimentPath, ...ExperimentLoader.PREPAREDMARKER_PATH);
    }
    /**
     * Check if the given experiment contains the prepared marker file.
     * @param experimentPath Path of an experiment.
     */
    static async isExperimentPrepared(experimentPath) {
        return await fs.pathExists(ExperimentLoader.getPreparedMarkerPath(experimentPath));
    }
    /**
     * Throw an error if the given experiment does not contain the prepared marker file.
     * @param experimentPath Path of an experiment.
     */
    static async requireExperimentPrepared(experimentPath) {
        if (!await ExperimentLoader.isExperimentPrepared(experimentPath)) {
            throw new ErrorHandled_1.ErrorHandled(`The experiment at '${experimentPath}' has not been prepared successfully yet, invoke 'jbr prepare' first.`);
        }
    }
    /**
     * Check if the given experiment path is a combinations-based experiment.
     * @param experimentPath Path of an experiment.
     * @throws if the combinations-based experiment is invalid.
     */
    static async isCombinationsExperiment(experimentPath) {
        const combinationsPath = Path.join(experimentPath, ExperimentLoader.COMBINATIONS_NAME);
        const combinationsPathExists = await fs.pathExists(combinationsPath);
        const configTemplatePath = Path.join(experimentPath, ExperimentLoader.CONFIG_TEMPLATE_NAME);
        const configTemplatePathExists = await fs.pathExists(configTemplatePath);
        if (combinationsPathExists !== configTemplatePathExists) {
            if (combinationsPathExists) {
                throw new Error(`Found '${ExperimentLoader.COMBINATIONS_NAME}' for a combinations-based experiment, but '${ExperimentLoader.CONFIG_TEMPLATE_NAME}' is missing.`);
            }
            else {
                throw new Error(`Found '${ExperimentLoader.CONFIG_TEMPLATE_NAME}' for a combinations-based experiment, but '${ExperimentLoader.COMBINATIONS_NAME}' is missing.`);
            }
        }
        return Boolean(combinationsPathExists && configTemplatePathExists);
    }
    /**
     * Throw an error if the given experiment is not a combinations-based experiment.
     * @param experimentPath Path of an experiment.
     */
    static async requireCombinationsExperiment(experimentPath) {
        if (!await ExperimentLoader.isCombinationsExperiment(experimentPath)) {
            throw new Error(`A combinations-based experiments requires the files '${ExperimentLoader.CONFIG_TEMPLATE_NAME}' and '${ExperimentLoader.COMBINATIONS_NAME}'.`);
        }
    }
    /**
     * Convert a given numerical combination id to a string-based id.
     * @param combinationId A numerical combination id.
     */
    static getCombinationIdString(combinationId) {
        return `combination_${combinationId}`;
    }
    /**
     * Determine the IRI of a combination
     * @param experimentIri An experiment IRI.
     * @param combinationIdString A combination id.
     */
    static getCombinationExperimentIri(experimentIri, combinationIdString) {
        return `${experimentIri}:${combinationIdString}`;
    }
}
exports.ExperimentLoader = ExperimentLoader;
ExperimentLoader.CONFIG_NAME = 'jbr-experiment.json';
ExperimentLoader.CONFIG_TEMPLATE_NAME = 'jbr-experiment.json.template';
ExperimentLoader.COMBINATIONS_NAME = 'jbr-combinations.json';
ExperimentLoader.PACKAGEJSON_NAME = 'package.json';
ExperimentLoader.PREPAREDMARKER_PATH = ['generated', '.prepared'];
ExperimentLoader.IRI_EXPERIMENT_HANDLER = `https://linkedsoftwaredependencies.org/bundles/npm/jbr/^2.0.0/components/experiment/ExperimentHandler.jsonld#ExperimentHandler`;
ExperimentLoader.IRI_HOOK_HANDLER = `https://linkedsoftwaredependencies.org/bundles/npm/jbr/^2.0.0/components/hook/HookHandler.jsonld#HookHandler`;
//# sourceMappingURL=ExperimentLoader.js.map