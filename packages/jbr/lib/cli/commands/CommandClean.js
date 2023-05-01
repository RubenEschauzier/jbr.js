"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const TaskClean_1 = require("../../task/TaskClean");
const CliHelpers_1 = require("../CliHelpers");
exports.command = 'clean';
exports.desc = 'Cleans up an experiment';
const builder = (yargs) => yargs
    .options({
    docker: { type: 'boolean', describe: 'Clean up any Docker entities' },
})
    .check((argv) => {
    if (argv._.length === 1 && argv.docker) {
        return true;
    }
    throw new Error('At least one clean option is required');
});
exports.builder = builder;
const handler = (argv) => (0, CliHelpers_1.wrapCommandHandler)(argv, async (context) => new TaskClean_1.TaskClean(context, argv).clean());
exports.handler = handler;
//# sourceMappingURL=CommandClean.js.map