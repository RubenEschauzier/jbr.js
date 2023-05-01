"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskClean = void 0;
const ExperimentLoader_1 = require("./ExperimentLoader");
/**
 * Cleans an experiment.
 */
class TaskClean {
    constructor(context, cleanTargets) {
        this.context = context;
        this.cleanTargets = cleanTargets;
    }
    async clean() {
        const { experiments, experimentPathsArray } = await (await ExperimentLoader_1.ExperimentLoader
            .build(this.context.mainModulePath))
            .instantiateExperiments(this.context.experimentName, this.context.experimentPaths.root);
        for (const [i, experiment] of experiments.entries()) {
            await experiment.clean(Object.assign(Object.assign({}, this.context), { experimentPaths: experimentPathsArray[i] }), this.cleanTargets);
        }
    }
}
exports.TaskClean = TaskClean;
//# sourceMappingURL=TaskClean.js.map