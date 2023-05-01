"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const TaskPack_1 = require("../../../lib/task/TaskPack");
const CliHelpers_1 = require("../CliHelpers");
exports.command = 'pack';
exports.desc = 'Create an archive of the experiment output';
const builder = (yargs) => yargs
    .options({
    output: {
        type: 'string',
        alias: 'o',
        describe: 'The output file name',
    },
});
exports.builder = builder;
const handler = (argv) => (0, CliHelpers_1.wrapCommandHandler)(argv, async (context) => new TaskPack_1.TaskPack(context, argv.output).pack());
exports.handler = handler;
//# sourceMappingURL=CommandPack.js.map