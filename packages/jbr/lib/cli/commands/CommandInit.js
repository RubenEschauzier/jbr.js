"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const TaskInitialize_1 = require("../../task/TaskInitialize");
const CliHelpers_1 = require("../CliHelpers");
const CommandSetHook_1 = require("./CommandSetHook");
exports.command = 'init <type> <name>';
exports.desc = 'Initializes a new experiment';
const builder = (yargs) => yargs
    .options({
    target: { type: 'string', describe: 'Experiment directory to create', defaultDescription: 'experiment name' },
    type: { type: 'string', describe: 'The type of experiment' },
    force: {
        type: 'boolean',
        alias: 'f',
        describe: 'If existing experiments must be overwritten',
    },
    combinations: {
        type: 'boolean',
        alias: 'c',
        describe: 'Creates a combinations-based experiment',
    },
    next: {
        type: 'boolean',
        describe: 'Install jbr at npm from the experimental next tag',
    },
});
exports.builder = builder;
const handler = (argv) => (0, CliHelpers_1.wrapCommandHandler)(argv, async (context) => {
    const target = argv.target || argv.name;
    const npmInstaller = await (0, CliHelpers_1.createNpmInstaller)(context, argv.next);
    const output = await (0, CliHelpers_1.wrapVisualProgress)(`Initializing new${argv.combinations ? ' combinations-based' : ''} experiment`, async () => new TaskInitialize_1.TaskInitialize(context, argv.type, argv.name, target, argv.force, argv.combinations, npmInstaller).init());
    context.logger.info(`Initialized new${argv.combinations ? ' combinations-based' : ''} experiment in ${output.experimentDirectory}`);
    if (output.hookNames.length > 0) {
        context.logger.warn(`\nThis experiment requires handlers for the following hooks before it can be used:`);
        for (const hookName of output.hookNames) {
            context.logger.warn(`  - ${hookName}`);
        }
        context.logger.warn(`Initialize these hooks by calling 'jbr ${CommandSetHook_1.command}'\n`);
    }
});
exports.handler = handler;
//# sourceMappingURL=CommandInit.js.map