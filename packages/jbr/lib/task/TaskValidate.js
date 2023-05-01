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
exports.TaskValidate = void 0;
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
const ErrorHandled_1 = require("../cli/ErrorHandled");
const ExperimentLoader_1 = require("./ExperimentLoader");
/**
 * Validates an experiment.
 */
class TaskValidate {
    constructor(context) {
        this.context = context;
    }
    async validate() {
        const errors = [];
        const combinationsBased = await fs.pathExists(path_1.default.join(this.context.experimentPaths.root, ExperimentLoader_1.ExperimentLoader.CONFIG_TEMPLATE_NAME)) ||
            await fs.pathExists(path_1.default.join(this.context.experimentPaths.root, ExperimentLoader_1.ExperimentLoader.COMBINATIONS_NAME));
        // Check if the required files exist
        for (const fileName of combinationsBased ? TaskValidate.REQUIRED_FILES_COMBINATIONS : TaskValidate.REQUIRED_FILES) {
            if (!await fs.pathExists(path_1.default.join(this.context.experimentPaths.root, fileName))) {
                errors.push(`Missing '${fileName}' file`);
            }
        }
        // Validate the experiment's config file
        try {
            await (await ExperimentLoader_1.ExperimentLoader.build(this.context.mainModulePath))
                .instantiateExperiments(this.context.experimentName, this.context.experimentPaths.root);
        }
        catch (error) {
            errors.push(`Invalid ${ExperimentLoader_1.ExperimentLoader.CONFIG_NAME} file: ${error.message}`);
        }
        // Emit a validation failed message
        if (errors.length > 0) {
            throw new ErrorHandled_1.ErrorHandled(`${combinationsBased ? 'Combinations-based experiment' : 'Experiment'} validation failed:
  - ${errors.join('\n  - ')}

Make sure you invoke this command in a directory created with 'jbr init${combinationsBased ? ' -c' : ''}'`);
        }
    }
}
exports.TaskValidate = TaskValidate;
TaskValidate.REQUIRED_FILES = [
    ExperimentLoader_1.ExperimentLoader.CONFIG_NAME,
    ExperimentLoader_1.ExperimentLoader.PACKAGEJSON_NAME,
];
TaskValidate.REQUIRED_FILES_COMBINATIONS = [
    ExperimentLoader_1.ExperimentLoader.CONFIG_TEMPLATE_NAME,
    ExperimentLoader_1.ExperimentLoader.COMBINATIONS_NAME,
    ExperimentLoader_1.ExperimentLoader.PACKAGEJSON_NAME,
];
//# sourceMappingURL=TaskValidate.js.map