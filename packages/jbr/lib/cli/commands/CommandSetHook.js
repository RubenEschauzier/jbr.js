"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const TaskSetHook_1 = require("../../task/TaskSetHook");
const CliHelpers_1 = require("../CliHelpers");
exports.command = 'set-hook <hook> <handler>';
exports.desc = 'Provide a handler for a hook in an experiment';
const builder = (yargs) => yargs
    .options({
    next: {
        type: 'boolean',
        describe: 'Install jbr at npm from the experimental next tag',
    },
});
exports.builder = builder;
const handler = (argv) => (0, CliHelpers_1.wrapCommandHandler)(argv, async (context) => {
    const npmInstaller = await (0, CliHelpers_1.createNpmInstaller)(context, argv.next);
    const output = await (0, CliHelpers_1.wrapVisualProgress)('Setting hook in experiment', async () => new TaskSetHook_1.TaskSetHook(context, argv.hook.split('/'), argv.handler, npmInstaller).set());
    context.logger.info(`Handler '${argv.handler}' has been set for hook '${argv.hook}' in experiment '${context.experimentName}'`);
    if (output.subHookNames.length > 0) {
        context.logger.warn(`\nThis hook requires the following sub-hooks before it can be used:`);
        for (const hookName of output.subHookNames) {
            context.logger.warn(`  - ${argv.hook}/${hookName}`);
        }
        context.logger.warn(`Initialize these hooks by calling 'jbr ${exports.command}'\n`);
    }
});
exports.handler = handler;
//# sourceMappingURL=CommandSetHook.js.map