"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCli = void 0;
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
function runCli(cwd, argv) {
    const { argv: params } = (0, yargs_1.default)((0, helpers_1.hideBin)(argv))
        .options({
        cwd: { type: 'string', default: cwd, describe: 'The current working directory', defaultDescription: '.' },
        mainModulePath: {
            type: 'string',
            alias: 'm',
            describe: 'Path from which modules should be loaded',
        },
        verbose: {
            type: 'boolean',
            alias: 'v',
            describe: 'If more logging output should be generated',
        },
        dockerOptions: {
            type: 'string',
            alias: 'd',
            describe: 'Path to a file with custom Docker options',
        },
        breakpoints: {
            type: 'boolean',
            alias: 'b',
            describe: 'If experiment breakpoints are enabled',
        },
    })
        .commandDir('commands')
        .demandCommand()
        .help();
}
exports.runCli = runCli;
//# sourceMappingURL=CliRunner.js.map