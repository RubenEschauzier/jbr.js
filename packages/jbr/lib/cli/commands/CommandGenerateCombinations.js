"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const TaskGenerateCombinations_1 = require("../../task/TaskGenerateCombinations");
const CliHelpers_1 = require("../CliHelpers");
exports.command = 'generate-combinations';
exports.desc = 'Generate combinations of experiment templates';
const builder = (yargs) => yargs;
exports.builder = builder;
const handler = (argv) => (0, CliHelpers_1.wrapCommandHandler)(argv, async (context) => {
    const combinations = await (0, CliHelpers_1.wrapVisualProgress)('Generating experiment combinations', async () => new TaskGenerateCombinations_1.TaskGenerateCombinations(context).generate());
    context.logger.info(`Generated ${combinations.length} experiment combinations`);
});
exports.handler = handler;
//# sourceMappingURL=CommandGenerateCombinations.js.map