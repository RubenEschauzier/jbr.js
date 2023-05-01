"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const TaskPrepare_1 = require("../../task/TaskPrepare");
const CliHelpers_1 = require("../CliHelpers");
exports.command = 'prepare';
exports.desc = 'Prepare data for the current experiment';
const builder = (yargs) => yargs
    .options({
    force: {
        type: 'boolean',
        alias: 'f',
        describe: 'If generated/ must be overwritten',
    },
    combination: {
        type: 'number',
        alias: 'c',
        describe: 'The combination id to run. If undefined, all combinations will be run.',
    },
});
exports.builder = builder;
const handler = (argv) => (0, CliHelpers_1.wrapCommandHandler)(argv, async (context) => new TaskPrepare_1.TaskPrepare(context, argv.force, argv.combination).prepare());
exports.handler = handler;
//# sourceMappingURL=CommandPrepare.js.map