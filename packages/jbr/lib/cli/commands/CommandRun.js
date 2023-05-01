"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const TaskRun_1 = require("../../task/TaskRun");
const CliHelpers_1 = require("../CliHelpers");
exports.command = 'run';
exports.desc = 'Run the current experiment';
const builder = (yargs) => yargs
    .options({
    combination: {
        type: 'number',
        alias: 'c',
        describe: 'The combination id to run. If undefined, all combinations will be run.',
    },
});
exports.builder = builder;
const handler = (argv) => (0, CliHelpers_1.wrapCommandHandler)(argv, async (context) => new TaskRun_1.TaskRun(context, argv.combination).run());
exports.handler = handler;
//# sourceMappingURL=CommandRun.js.map