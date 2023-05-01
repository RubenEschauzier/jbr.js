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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskGenerateCombinations = void 0;
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
const ExperimentLoader_1 = require("./ExperimentLoader");
const TaskInitialize_1 = require("./TaskInitialize");
/**
 * Generates combinations based on an experiment template and a combination provider.
 */
class TaskGenerateCombinations {
    constructor(context) {
        this.context = context;
    }
    async generate() {
        await ExperimentLoader_1.ExperimentLoader.requireCombinationsExperiment(this.context.experimentPaths.root);
        // Determine combinations
        const experimentLoader = await ExperimentLoader_1.ExperimentLoader.build(this.context.mainModulePath);
        const combinationsProvider = await experimentLoader
            .instantiateCombinationProvider(this.context.experimentName, this.context.experimentPaths.root);
        const combinations = combinationsProvider.getFactorCombinations();
        // Determine experiment id
        const experimentId = ExperimentLoader_1.ExperimentLoader.getDefaultExperimentIri(this.context.experimentName);
        // Load config template
        const configTemplatePath = path_1.default.join(this.context.experimentPaths.root, ExperimentLoader_1.ExperimentLoader.CONFIG_TEMPLATE_NAME);
        const configTemplateContents = await fs.readFile(configTemplatePath, 'utf8');
        // Create combination directories and config files
        const combinationsPath = path_1.default.join(this.context.experimentPaths.root, 'combinations');
        if (!await fs.pathExists(combinationsPath)) {
            await fs.mkdir(combinationsPath);
        }
        for (const [combinationId, combination] of combinations.entries()) {
            // Create combination directory
            const combinationIdString = ExperimentLoader_1.ExperimentLoader.getCombinationIdString(combinationId);
            const combinationInstancePath = path_1.default.join(combinationsPath, combinationIdString);
            if (!await fs.pathExists(combinationInstancePath)) {
                await fs.mkdir(combinationInstancePath);
                for (const initDir of TaskInitialize_1.TaskInitialize.INIT_DIRS) {
                    const dir = path_1.default.join(combinationInstancePath, initDir);
                    await fs.mkdir(dir);
                    await fs.createFile(path_1.default.join(dir, '.keep'));
                }
            }
            // Create config file
            const combinationInstanceConfigPath = path_1.default.join(combinationInstancePath, ExperimentLoader_1.ExperimentLoader.CONFIG_NAME);
            const combinationInstanceConfigContents = TaskGenerateCombinations
                .applyFactorCombination(combination, experimentId, combinationIdString, configTemplateContents);
            await fs.writeFile(combinationInstanceConfigPath, combinationInstanceConfigContents);
            // Copy inputs
            const combinationInputPath = path_1.default.join(combinationInstancePath, 'input');
            const templateInputPath = path_1.default.join(this.context.experimentPaths.root, 'input');
            await TaskGenerateCombinations.copyFiles(templateInputPath, combinationInputPath, (contents) => TaskGenerateCombinations
                .applyFactorCombination(combination, experimentId, combinationIdString, contents));
            // Create output softlink from root to combinations
            // Note that these paths are absolute because of Windows...
            const combinationOutputPath = path_1.default.join(this.context.experimentPaths.root, 'output', combinationIdString);
            if (await fs.pathExists(combinationOutputPath)) {
                await fs.unlink(combinationOutputPath);
            }
            await fs.symlink(path_1.default.join(combinationInstancePath, 'output'), combinationOutputPath);
        }
        // Instantiate experiments for validation
        await (await ExperimentLoader_1.ExperimentLoader.build(this.context.mainModulePath))
            .instantiateExperiments(this.context.experimentName, this.context.experimentPaths.root);
        return combinations;
    }
    /**
     * Instantiate all variables in the form of %FACTOR-variablename% based on the given factor combination.
     * @param combination A factor combination that maps variable names to values.
     * @param experimentId The experiment id.
     * @param combinationId The combination id.
     * @param content The string content in which variable names should be replaced.
     */
    static applyFactorCombination(combination, experimentId, combinationId, content) {
        content = content.replace(new RegExp(experimentId, 'gu'), ExperimentLoader_1.ExperimentLoader.getCombinationExperimentIri(experimentId, combinationId));
        for (const [key, value] of Object.entries(combination)) {
            content = content.replace(new RegExp(`%FACTOR-${key}%`, 'gu'), value);
        }
        return content;
    }
    /**
     * Copy all files in the given source to the given destination.
     * Additionally, apply the given mapper function on all copied file contents.
     * @param sourceDirectory Directory to copy from.
     * @param destinationDirectory Directory to copy to.
     * @param mapper A function to map file contents when copying.
     */
    static async copyFiles(sourceDirectory, destinationDirectory, mapper) {
        for (const entry of await fs.readdir(sourceDirectory, { withFileTypes: true })) {
            if (entry.isFile()) {
                const contents = await fs.readFile(path_1.default.join(sourceDirectory, entry.name), 'utf8');
                await fs.writeFile(path_1.default.join(destinationDirectory, entry.name), mapper(contents));
            }
            else if (entry.isDirectory()) {
                await fs.mkdirp(path_1.default.join(destinationDirectory, entry.name));
                await TaskGenerateCombinations.copyFiles(path_1.default.join(sourceDirectory, entry.name), path_1.default.join(destinationDirectory, entry.name), mapper);
            }
        }
    }
}
exports.TaskGenerateCombinations = TaskGenerateCombinations;
//# sourceMappingURL=TaskGenerateCombinations.js.map