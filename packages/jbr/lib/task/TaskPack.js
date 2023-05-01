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
exports.TaskPack = void 0;
const tar = __importStar(require("tar"));
const ExperimentLoader_1 = require("./ExperimentLoader");
/**
 * Archives an experiment.
 */
class TaskPack {
    constructor(context, outputName) {
        this.context = context;
        this.outputName = outputName;
    }
    async pack() {
        var _a;
        const { experimentPathsArray } = await (await ExperimentLoader_1.ExperimentLoader.build(this.context.mainModulePath))
            .instantiateExperiments(this.context.experimentName, this.context.experimentPaths.root);
        await tar.create({
            cwd: this.context.cwd,
            gzip: true,
            file: (_a = this.outputName) !== null && _a !== void 0 ? _a : `jbr-${this.context.experimentName}-output.tar.gz`,
        }, experimentPathsArray.map(experimentPaths => {
            if (!experimentPaths.output.startsWith(this.context.cwd)) {
                throw new Error(`Illegal experiment output path '${experimentPaths.output}' outside of cwd scope '${this.context.cwd}'`);
            }
            return experimentPaths.output.slice(this.context.cwd.length + 1);
        }));
    }
}
exports.TaskPack = TaskPack;
//# sourceMappingURL=TaskPack.js.map