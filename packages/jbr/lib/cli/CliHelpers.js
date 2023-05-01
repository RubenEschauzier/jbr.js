"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNpmInstaller = exports.createCliLogger = exports.wrapVisualProgress = exports.wrapCommandHandler = exports.breakpointBarrier = exports.createExperimentPaths = void 0;
const Path = __importStar(require("path"));
const util = __importStar(require("util"));
const dockerode_1 = __importDefault(require("dockerode"));
const fs = __importStar(require("fs-extra"));
const ora_1 = __importDefault(require("ora"));
const winston_1 = require("winston");
const CliNpmInstaller_1 = require("../../lib/npm/CliNpmInstaller");
const VoidNpmInstaller_1 = require("../../lib/npm/VoidNpmInstaller");
const DockerContainerCreator_1 = require("../docker/DockerContainerCreator");
const DockerImageBuilder_1 = require("../docker/DockerImageBuilder");
const DockerImagePuller_1 = require("../docker/DockerImagePuller");
const DockerNetworkCreator_1 = require("../docker/DockerNetworkCreator");
const ExperimentLoader_1 = require("../task/ExperimentLoader");
function createExperimentPaths(basePath, combination) {
    return {
        root: basePath,
        input: Path.join(basePath, 'input'),
        generated: Path.join(basePath, 'generated'),
        output: Path.join(basePath, 'output'),
        combination,
    };
}
exports.createExperimentPaths = createExperimentPaths;
function breakpointBarrier() {
    return new Promise(resolve => {
        process.stdout.write('BREAKPOINT: Press any key to continue\n');
        process.stdin.setRawMode(true);
        process.stdin.on('data', () => {
            process.stdin.setRawMode(false);
            resolve();
        });
    });
}
exports.breakpointBarrier = breakpointBarrier;
async function wrapCommandHandler(argv, handler) {
    const startTime = process.hrtime();
    // Create context
    const dockerode = new dockerode_1.default(argv.dockerOptions ?
        // eslint-disable-next-line no-sync
        JSON.parse(await fs.readFile(argv.dockerOptions, 'utf8')) :
        undefined);
    const context = Object.assign({ cwd: argv.cwd, experimentPaths: createExperimentPaths(argv.cwd), experimentName: await ExperimentLoader_1.ExperimentLoader.getExperimentName(argv.cwd), mainModulePath: argv.mainModulePath || argv.cwd, verbose: argv.verbose, logger: createCliLogger(argv.verbose ? 'verbose' : 'info'), docker: {
            containerCreator: new DockerContainerCreator_1.DockerContainerCreator(dockerode),
            imageBuilder: new DockerImageBuilder_1.DockerImageBuilder(dockerode),
            imagePuller: new DockerImagePuller_1.DockerImagePuller(dockerode),
            networkCreator: new DockerNetworkCreator_1.DockerNetworkCreator(dockerode),
        }, 
        // eslint-disable-next-line unicorn/no-process-exit
        closeExperiment: () => process.emit('SIGTERM'), cleanupHandlers: [] }, argv.breakpoints ? { breakpointBarrier } : {});
    // Register cleanup handling
    let performingGlobalCleanup = false;
    const globalCleanupHandler = async (uncaughtException) => {
        // Print error if uncaught exception
        if (uncaughtException instanceof Error) {
            // eslint-disable-next-line no-console
            console.error('Uncaught Exception:');
            // eslint-disable-next-line no-console
            console.error(uncaughtException);
        }
        performingGlobalCleanup = true;
        try {
            for (const cleanupHandler of context.cleanupHandlers) {
                await cleanupHandler();
            }
        }
        catch (error) {
            context.logger.error(`${util.format(error)}`);
        }
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
    };
    process.on('SIGINT', globalCleanupHandler);
    process.on('SIGTERM', globalCleanupHandler);
    process.on('uncaughtException', globalCleanupHandler);
    // Run handler
    let completed = false;
    try {
        await handler(context);
        completed = true;
    }
    catch (error) {
        if (!performingGlobalCleanup) {
            if ('handled' in error) {
                context.logger.error(`${error.message}`);
            }
            else {
                context.logger.error(`${util.format(error)}`);
            }
        }
    }
    finally {
        if (!performingGlobalCleanup) {
            const endTime = process.hrtime(startTime);
            const seconds = (endTime[0] + endTime[1] / 1000000000).toFixed(2);
            if (completed) {
                context.logger.info(`✨ Done in ${seconds}s`);
            }
            else {
                context.logger.info(`🚨 Errored in ${seconds}s`);
                // eslint-disable-next-line unicorn/no-process-exit
                process.exit(1);
            }
        }
    }
}
exports.wrapCommandHandler = wrapCommandHandler;
async function wrapVisualProgress(label, handler) {
    const spinner = (0, ora_1.default)(label).start();
    try {
        return await handler();
    }
    finally {
        spinner.stop();
    }
}
exports.wrapVisualProgress = wrapVisualProgress;
function createCliLogger(logLevel) {
    return (0, winston_1.createLogger)({
        level: logLevel,
        format: winston_1.format.combine(winston_1.format.colorize({ all: true, colors: { info: 'white' } }), winston_1.format.timestamp(), winston_1.format.printf(({ message }) => `${message}`)),
        transports: [new winston_1.transports.Console({
                stderrLevels: ['error', 'warn', 'info', 'verbose', 'debug', 'silly'],
            })],
    });
}
exports.createCliLogger = createCliLogger;
async function createNpmInstaller(context, nextVersion) {
    return await fs.pathExists(`${__dirname}/../../test`) && Path.join(process.cwd(), Path.sep).startsWith(Path.join(__dirname, '../../../../')) ? new VoidNpmInstaller_1.VoidNpmInstaller() : new CliNpmInstaller_1.CliNpmInstaller(context, nextVersion);
}
exports.createNpmInstaller = createNpmInstaller;
//# sourceMappingURL=CliHelpers.js.map