"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRun = void 0;
const ExperimentLoader_1 = require("./ExperimentLoader");
/**
 * Runs the run phase of an experiment.
 */
class TaskRun {
    constructor(context, combination) {
        this.context = context;
        this.combination = combination;
    }
    async run() {
        await ExperimentLoader_1.ExperimentLoader.requireExperimentPrepared(this.context.experimentPaths.root);
        const { experiments, experimentPathsArray } = await (await ExperimentLoader_1.ExperimentLoader.build(this.context.mainModulePath))
            .instantiateExperiments(this.context.experimentName, this.context.experimentPaths.root);
        for (const [i, experiment] of experiments.entries()) {
            if (this.combination === undefined || this.combination === i) {
                // Log status
                if (experiments.length > 1) {
                    this.context.logger.info(`🧩 Running experiment combination ${i}`);
                }
                await experiment.run(Object.assign(Object.assign({}, this.context), { experimentPaths: experimentPathsArray[i] }));
            }
        }
    }
}
exports.TaskRun = TaskRun;
//# sourceMappingURL=TaskRun.js.map