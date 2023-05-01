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
exports.TaskPrepare = void 0;
const fs = __importStar(require("fs-extra"));
const ExperimentLoader_1 = require("./ExperimentLoader");
/**
 * Runs the preparation phase of an experiment.
 */
class TaskPrepare {
    constructor(context, forceOverwriteGenerated, combination) {
        this.context = context;
        this.forceOverwriteGenerated = forceOverwriteGenerated;
        this.combination = combination;
    }
    async prepare() {
        // Remove hidden marker file if it exists
        const markerPath = ExperimentLoader_1.ExperimentLoader.getPreparedMarkerPath(this.context.experimentPaths.root);
        if (await fs.pathExists(markerPath)) {
            await fs.unlink(markerPath);
        }
        // Run experiment's prepare logic
        const { experiments, experimentPathsArray, combinationProvider } = await (await ExperimentLoader_1.ExperimentLoader
            .build(this.context.mainModulePath))
            .instantiateExperiments(this.context.experimentName, this.context.experimentPaths.root);
        for (const [i, experiment] of experiments.entries()) {
            if (this.combination === undefined || this.combination === i) {
                this.context.logger.info(`🧩 Preparing experiment combination ${i}`);
                await experiment.prepare(Object.assign(Object.assign({}, this.context), { experimentPaths: experimentPathsArray[i] }), this.forceOverwriteGenerated);
            }
        }
        // Create a hidden marker file in generate/ to indicate that this experiment has been successfully prepared
        await fs.writeFile(markerPath, '', 'utf8');
    }
}
exports.TaskPrepare = TaskPrepare;
//# sourceMappingURL=TaskPrepare.js.map