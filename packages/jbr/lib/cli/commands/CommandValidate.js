"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const TaskValidate_1 = require("../../task/TaskValidate");
const CliHelpers_1 = require("../CliHelpers");
exports.command = 'validate';
exports.desc = 'Validate the current experiment';
const builder = (yargs) => yargs;
exports.builder = builder;
const handler = (argv) => (0, CliHelpers_1.wrapCommandHandler)(argv, async (context) => new TaskValidate_1.TaskValidate(context).validate());
exports.handler = handler;
//# sourceMappingURL=CommandValidate.js.map