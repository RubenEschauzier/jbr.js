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
exports.TaskSetHook = void 0;
const Path = __importStar(require("path"));
const util_1 = require("util");
const fs = __importStar(require("fs-extra"));
const ErrorHandled_1 = require("../cli/ErrorHandled");
const HookNonConfigured_1 = require("../hook/HookNonConfigured");
const ExperimentLoader_1 = require("./ExperimentLoader");
const TaskGenerateCombinations_1 = require("./TaskGenerateCombinations");
/**
 * Sets a handler for a given experiment's hook
 */
class TaskSetHook {
    constructor(context, hookPathName, handlerTypeId, npmInstaller) {
        this.context = context;
        this.hookPathName = hookPathName;
        this.handlerTypeId = handlerTypeId;
        this.npmInstaller = npmInstaller;
    }
    async set() {
        // Invoke npm install for hook
        const hookPackageName = `@jbr-hook/${this.handlerTypeId}`;
        await this.npmInstaller.install(this.context.experimentPaths.root, [hookPackageName], 'jbr-hook');
        // Resolve hook type
        const experimentLoader = await ExperimentLoader_1.ExperimentLoader.build(this.context.mainModulePath);
        const handlerTypes = await experimentLoader.discoverHookHandlers();
        const handlerTypeWrapped = handlerTypes[this.handlerTypeId];
        if (!handlerTypeWrapped) {
            throw new ErrorHandled_1.ErrorHandled(`Invalid hook type '${this.handlerTypeId}'. Must be one of '${Object.keys(handlerTypes).join(', ')}'`);
        }
        const { handler: handlerType, contexts } = handlerTypeWrapped;
        // Read config file
        const combinationsExperiment = await ExperimentLoader_1.ExperimentLoader.isCombinationsExperiment(this.context.experimentPaths.root);
        const configPath = Path.join(this.context.experimentPaths.root, combinationsExperiment ? ExperimentLoader_1.ExperimentLoader.CONFIG_TEMPLATE_NAME : ExperimentLoader_1.ExperimentLoader.CONFIG_NAME);
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        const experimentIri = config['@id'];
        // Prepare sub-hooks
        const subHookNames = handlerType.getSubHookNames();
        const subHookEntries = subHookNames.reduce((acc, hookName) => {
            acc[hookName] = {
                '@id': `${experimentIri}:${hookName}`,
                '@type': HookNonConfigured_1.HookNonConfigured.name,
            };
            return acc;
        }, {});
        // Find hook
        TaskSetHook.getObjectPath(configPath, config, this.hookPathName);
        // Set hook value
        TaskSetHook.setObjectPath(configPath, config, this.hookPathName, Object.assign(Object.assign({ '@id': `${experimentIri}:${this.hookPathName.join('_')}`, '@type': handlerType.hookClassName }, handlerType.getDefaultParams(this.context.experimentPaths)), subHookEntries));
        // Append contexts
        for (const context of contexts) {
            if (!config['@context'].includes(context)) {
                config['@context'].push(context);
            }
        }
        // Write updated config file
        await fs.writeFile(configPath, JSON.stringify(config, null, '  '), 'utf8');
        // For combination-based experiments, re-generate combinations
        if (combinationsExperiment) {
            await new TaskGenerateCombinations_1.TaskGenerateCombinations(this.context).generate();
        }
        // Instantiate experiment for validation
        const { experiments } = await experimentLoader
            .instantiateExperiments(this.context.experimentName, this.context.experimentPaths.root);
        // Invoke the handler type's init logic
        for (const experiment of experiments) {
            await handlerType.init(this.context.experimentPaths, TaskSetHook.getObjectPath(configPath, experiment, this.hookPathName));
        }
        // Remove hidden prepared marker file if it exists
        const markerPath = ExperimentLoader_1.ExperimentLoader.getPreparedMarkerPath(this.context.experimentPaths.root);
        if (await fs.pathExists(markerPath)) {
            await fs.unlink(markerPath);
            this.context.logger.warn(`Removed 'prepared' flag from this experiment. Invoke 'jbr prepare' before running this experiment.`);
        }
        return { subHookNames };
    }
    static getObjectPath(configPath, object, path) {
        if (path.length === 0) {
            return object;
        }
        const child = object[path[0]];
        if (!child) {
            throw new Error(`Illegal hook path: could not find '${path[0]}' in '${configPath}' on ${(0, util_1.inspect)(object)}`);
        }
        return TaskSetHook.getObjectPath(configPath, child, path.slice(1));
    }
    static setObjectPath(configPath, object, path, value) {
        if (path.length === 0) {
            throw new Error(`Illegal hook path of length 0`);
        }
        else if (path.length === 1) {
            object[path[0]] = value;
        }
        else {
            const child = object[path[0]];
            if (!child) {
                throw new Error(`Illegal hook path: could not set a child for '${path[0]}' in '${configPath}' on ${(0, util_1.inspect)(object)}`);
            }
            return TaskSetHook.setObjectPath(configPath, child, path.slice(1), value);
        }
    }
}
exports.TaskSetHook = TaskSetHook;
//# sourceMappingURL=TaskSetHook.js.map