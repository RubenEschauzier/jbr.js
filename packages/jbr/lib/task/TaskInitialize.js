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
exports.TaskInitialize = void 0;
const Path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const CliHelpers_1 = require("../cli/CliHelpers");
const ErrorHandled_1 = require("../cli/ErrorHandled");
const HookNonConfigured_1 = require("../hook/HookNonConfigured");
const ExperimentLoader_1 = require("./ExperimentLoader");
const TaskGenerateCombinations_1 = require("./TaskGenerateCombinations");
/**
 * Initializes an experiment of the given type.
 */
class TaskInitialize {
    constructor(context, experimentTypeId, experimentName, targetDirectory, forceReInit, combinations, npmInstaller) {
        this.context = context;
        this.experimentTypeId = experimentTypeId;
        this.experimentName = experimentName;
        this.targetDirectory = Path.join(this.context.cwd, targetDirectory);
        this.forceReInit = forceReInit;
        this.combinations = combinations;
        this.npmInstaller = npmInstaller;
    }
    async init() {
        // Require target not to exist
        if (await fs.pathExists(this.targetDirectory)) {
            if (this.forceReInit) {
                await fs.remove(this.targetDirectory);
            }
            else {
                throw new ErrorHandled_1.ErrorHandled(`The target directory already exists: '${this.targetDirectory}'`);
            }
        }
        // Create experiment directory
        await fs.mkdir(this.targetDirectory);
        for (const initDir of TaskInitialize.INIT_DIRS) {
            await fs.mkdir(Path.join(this.targetDirectory, initDir));
        }
        // Create package.json
        const experimentPackageJson = {
            private: true,
            name: this.experimentName,
            dependencies: {
                'cross-env': '^7.0.3',
            },
            scripts: {
                jbr: 'cross-env NODE_OPTIONS=--max-old-space-size=8192 jbr',
                validate: 'jbr validate',
            },
        };
        const packageJsonPath = Path.join(this.targetDirectory, ExperimentLoader_1.ExperimentLoader.PACKAGEJSON_NAME);
        await fs.writeFile(packageJsonPath, JSON.stringify(experimentPackageJson, null, '  '), 'utf8');
        // Invoke npm install for jbr and experiment
        const experimentPackageName = `@jbr-experiment/${this.experimentTypeId}`;
        await this.npmInstaller.install(this.targetDirectory, ['jbr', experimentPackageName], 'jbr-experiment');
        // Resolve experiment type
        const experimentLoader = await ExperimentLoader_1.ExperimentLoader.build(this.targetDirectory);
        const experimentTypes = await experimentLoader.discoverExperimentHandlers();
        const experimentTypeWrapped = experimentTypes[this.experimentTypeId];
        if (!experimentTypeWrapped) {
            throw new Error(`Invalid experiment type '${this.experimentTypeId}'. Must be one of '${Object.keys(experimentTypes).join(', ')}'`);
        }
        const { handler: experimentType, contexts } = experimentTypeWrapped;
        // Determine jbr context url
        const jbrContextUrl = JSON.parse(await fs
            .readFile(Path.join(__dirname, '../../components/components.jsonld'), 'utf8'))['@context'][0];
        // Create config
        const experimentIri = ExperimentLoader_1.ExperimentLoader.getDefaultExperimentIri(this.experimentName);
        const hookNames = experimentType.getHookNames();
        const hookEntries = hookNames.reduce((acc, hookName) => {
            acc[hookName] = {
                '@id': `${experimentIri}:${hookName}`,
                '@type': HookNonConfigured_1.HookNonConfigured.name,
            };
            return acc;
        }, {});
        const experimentPaths = (0, CliHelpers_1.createExperimentPaths)(this.targetDirectory);
        const experimentConfig = Object.assign(Object.assign({ '@context': [
                jbrContextUrl,
                ...contexts,
            ], '@id': experimentIri, '@type': experimentType.experimentClassName }, experimentType.getDefaultParams(experimentPaths)), hookEntries);
        const configPath = Path.join(this.targetDirectory, this.combinations ?
            ExperimentLoader_1.ExperimentLoader.CONFIG_TEMPLATE_NAME :
            ExperimentLoader_1.ExperimentLoader.CONFIG_NAME);
        await fs.writeFile(configPath, JSON.stringify(experimentConfig, null, '  '), 'utf8');
        // Create combinations file for combinations-based experiments
        if (this.combinations) {
            const combinationsConfig = {
                '@context': [
                    jbrContextUrl,
                ],
                '@id': `${experimentIri}-combinations`,
                '@type': 'FullFactorialCombinationProvider',
                commonGenerated: false,
                factors: {},
            };
            const combinationsPath = Path.join(this.targetDirectory, ExperimentLoader_1.ExperimentLoader.COMBINATIONS_NAME);
            await fs.writeFile(combinationsPath, JSON.stringify(combinationsConfig, null, '  '), 'utf8');
            // Generate initial combinations
            await new TaskGenerateCombinations_1.TaskGenerateCombinations(Object.assign(Object.assign({}, this.context), { experimentName: this.experimentName, mainModulePath: this.targetDirectory, experimentPaths: (0, CliHelpers_1.createExperimentPaths)(this.targetDirectory, 0) })).generate();
        }
        // Copy template files
        for (const file of ['.gitignore', 'README.md']) {
            await fs.copyFile(Path.join(__dirname, '..', 'templates', file), Path.join(this.targetDirectory, file));
        }
        await fs.createFile(Path.join(this.targetDirectory, 'generated', '.keep'));
        await fs.createFile(Path.join(this.targetDirectory, 'output', '.keep'));
        // Instantiate experiment for validation
        const { experiments } = await experimentLoader
            .instantiateExperiments(await ExperimentLoader_1.ExperimentLoader.getExperimentName(this.targetDirectory), this.targetDirectory);
        // Invoke the experiment type's init logic
        for (const experiment of experiments) {
            await experimentType.init(experimentPaths, experiment);
        }
        return {
            experimentDirectory: this.targetDirectory,
            hookNames,
        };
    }
}
exports.TaskInitialize = TaskInitialize;
TaskInitialize.INIT_DIRS = [
    'input',
    'generated',
    'output',
];
//# sourceMappingURL=TaskInitialize.js.map