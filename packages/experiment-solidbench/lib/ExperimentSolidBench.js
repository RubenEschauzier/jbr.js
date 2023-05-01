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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperimentSolidBench = void 0;
const Path = __importStar(require("path"));
const v8 = __importStar(require("v8"));
const fs = __importStar(require("fs-extra"));
const jbr_1 = require("jbr");
const Generator_1 = require("solidbench/lib/Generator");
const sparql_benchmark_runner_1 = require("sparql-benchmark-runner");
/**
 * An experiment instance for the SolidBench social network benchmark.
 */
class ExperimentSolidBench {
    /**
     * @param scale
     * @param configGenerateAux
     * @param configFragment
     * @param configFragmentAux
     * @param configQueries
     * @param configServer
     * @param validationParamsUrl
     * @param configValidation
     * @param hadoopMemory
     * @param dockerfileServer
     * @param hookSparqlEndpoint
     * @param serverPort
     * @param serverLogLevel
     * @param serverBaseUrl
     * @param serverResourceConstraints
     * @param endpointUrl
     * @param queryRunnerReplication
     * @param queryRunnerWarmupRounds
     * @param queryRunnerRecordTimestamps
     * @param queryRunnerRecordHttpRequests
     * @param queryRunnerUpQuery
     * @param queryRunnerUrlParamsInit - @range {json}
     * @param queryRunnerUrlParamsRun - @range {json}
     * @param queryTimeoutFallback
     */
    constructor(scale, configGenerateAux, configFragment, configFragmentAux, configQueries, configServer, validationParamsUrl, configValidation, hadoopMemory, dockerfileServer, hookSparqlEndpoint, serverPort, serverLogLevel, serverBaseUrl, serverResourceConstraints, endpointUrl, queryRunnerReplication, queryRunnerWarmupRounds, queryRunnerRecordTimestamps, queryRunnerRecordHttpRequests, queryRunnerUpQuery, queryRunnerUrlParamsInit, queryRunnerUrlParamsRun, queryTimeoutFallback) {
        this.scale = scale;
        this.configGenerateAux = configGenerateAux;
        this.configFragment = configFragment;
        this.configFragmentAux = configFragmentAux;
        this.configQueries = configQueries;
        this.configServer = configServer;
        this.validationParamsUrl = validationParamsUrl;
        this.configValidation = configValidation;
        this.hadoopMemory = hadoopMemory;
        this.dockerfileServer = dockerfileServer;
        this.hookSparqlEndpoint = hookSparqlEndpoint;
        this.endpointUrl = endpointUrl;
        this.serverPort = serverPort;
        this.serverLogLevel = serverLogLevel;
        this.serverBaseUrl = serverBaseUrl;
        this.serverResourceConstraints = serverResourceConstraints;
        this.queryRunnerReplication = queryRunnerReplication;
        this.queryRunnerWarmupRounds = queryRunnerWarmupRounds;
        this.queryRunnerRecordTimestamps = queryRunnerRecordTimestamps;
        this.queryRunnerRecordHttpRequests = queryRunnerRecordHttpRequests;
        this.queryRunnerUpQuery = queryRunnerUpQuery;
        this.queryRunnerUrlParamsInit = queryRunnerUrlParamsInit;
        this.queryRunnerUrlParamsRun = queryRunnerUrlParamsRun;
        this.queryTimeoutFallback = queryTimeoutFallback;
    }
    getDockerImageName(context, type) {
        return context.docker.imageBuilder.getImageName(context, `solidbench-${type}`);
    }
    async replaceBaseUrlInDir(path) {
        for (const entry of await fs.readdir(path, { withFileTypes: true })) {
            if (entry.isFile()) {
                const file = Path.join(path, entry.name);
                await fs.writeFile(file, (await fs.readFile(file, 'utf8'))
                    .replace(/localhost:3000/ug, 'solidbench-server:3000'));
            }
            else if (entry.isDirectory()) {
                await this.replaceBaseUrlInDir(Path.join(path, entry.name));
            }
        }
    }
    async prepare(context, forceOverwriteGenerated) {
        // Validate memory limit
        const minimumMemory = 8192;
        // eslint-disable-next-line no-bitwise
        const currentMemory = v8.getHeapStatistics().heap_size_limit / 1024 / 1024;
        if (currentMemory < minimumMemory) {
            context.logger.warn(`SolidBench recommends allocating at least ${minimumMemory} MB of memory, while only ${currentMemory} was allocated.\nThis can be configured using Node's --max_old_space_size option.`);
        }
        // Prepare hook
        await this.hookSparqlEndpoint.prepare(context, forceOverwriteGenerated);
        // Prepare dataset
        await new Generator_1.Generator({
            verbose: context.verbose,
            cwd: context.experimentPaths.generated,
            overwrite: forceOverwriteGenerated,
            scale: this.scale,
            enhancementConfig: Path.resolve(context.cwd, this.configGenerateAux),
            fragmentConfig: Path.resolve(context.cwd, this.configFragment),
            enhancementFragmentConfig: Path.resolve(context.cwd, this.configFragmentAux),
            queryConfig: Path.resolve(context.cwd, this.configQueries),
            validationParams: this.validationParamsUrl,
            validationConfig: Path.resolve(context.cwd, this.configValidation),
            hadoopMemory: this.hadoopMemory,
        }).generate();
        // Replace prefix URLs to correct base URL in queries directory
        await this.replaceBaseUrlInDir(Path.resolve(context.experimentPaths.generated, 'out-queries'));
        // Build server Dockerfile
        await context.docker.imageBuilder.build({
            cwd: context.experimentPaths.root,
            dockerFile: this.dockerfileServer,
            auxiliaryFiles: [this.configServer],
            imageName: this.getDockerImageName(context, 'server'),
            buildArgs: {
                CONFIG_SERVER: this.configServer,
                LOG_LEVEL: this.serverLogLevel,
                BASE_URL: this.serverBaseUrl,
            },
            logger: context.logger,
        });
    }
    async run(context) {
        // Start server
        const [serverHandler, networkHandler] = await this.startServer(context);
        // Setup SPARQL endpoint
        const network = networkHandler.network.id;
        const endpointProcessHandler = await this.hookSparqlEndpoint.start(context, { docker: { network } });
        const processHandler = new jbr_1.ProcessHandlerComposite([
            serverHandler,
            endpointProcessHandler,
            networkHandler,
        ]);
        const closeProcess = (0, jbr_1.secureProcessHandler)(processHandler, context);
        // Initiate SPARQL benchmark runner
        let stopStats;
        const results = await new sparql_benchmark_runner_1.SparqlBenchmarkRunner({
            endpoint: this.endpointUrl,
            querySets: await (0, sparql_benchmark_runner_1.readQueries)(Path.join(context.experimentPaths.generated, 'out-queries')),
            replication: this.queryRunnerReplication,
            warmup: this.queryRunnerWarmupRounds,
            timestampsRecording: this.queryRunnerRecordTimestamps,
            logger: (message) => process.stderr.write(message),
            upQuery: this.queryRunnerUpQuery,
            additionalUrlParamsInit: new URLSearchParams(this.queryRunnerUrlParamsInit),
            additionalUrlParamsRun: new URLSearchParams(this.queryRunnerUrlParamsRun),
            timeout: this.queryTimeoutFallback,
        }).run({
            async onStart() {
                // Collect stats
                stopStats = await processHandler.startCollectingStats();
                // Breakpoint right before starting queries.
                if (context.breakpointBarrier) {
                    await context.breakpointBarrier();
                }
            },
            async onStop() {
                stopStats();
            },
        });
        // Write results
        const resultsOutput = context.experimentPaths.output;
        if (!await fs.pathExists(resultsOutput)) {
            await fs.mkdir(resultsOutput);
        }
        context.logger.info(`Writing results to ${resultsOutput}\n`);
        await (0, sparql_benchmark_runner_1.writeBenchmarkResults)(results, Path.join(resultsOutput, 'query-times.csv'), this.queryRunnerRecordTimestamps, [
            ...this.queryRunnerRecordHttpRequests ? ['httpRequests'] : [],
        ]);
        // Close endpoint and server
        await closeProcess();
    }
    async startServer(context) {
        // Create shared network
        const networkHandler = await context.docker.networkCreator
            .create({ Name: this.getDockerImageName(context, 'network') });
        const network = networkHandler.network.id;
        // Ensure logs directory exists
        await fs.ensureDir(Path.join(context.experimentPaths.output, 'logs'));
        const filePath = this.serverBaseUrl.replace('://', '/').replace(':', '_');
        const serverHandler = await context.docker.containerCreator.start({
            containerName: 'solidbench-server',
            imageName: this.getDockerImageName(context, 'server'),
            resourceConstraints: this.serverResourceConstraints,
            hostConfig: {
                Binds: [
                    `${Path.join(context.experimentPaths.generated, `out-fragments/${filePath}`)}/:/data`,
                ],
                PortBindings: {
                    '3000/tcp': [
                        { HostPort: `${this.serverPort}` },
                    ],
                },
                NetworkMode: network,
            },
            logFilePath: Path.join(context.experimentPaths.output, 'logs', 'server.txt'),
            statsFilePath: Path.join(context.experimentPaths.output, 'stats-server.csv'),
        });
        return [serverHandler, networkHandler];
    }
    async clean(context, cleanTargets) {
        await this.hookSparqlEndpoint.clean(context, cleanTargets);
        if (cleanTargets.docker) {
            await context.docker.networkCreator.remove(this.getDockerImageName(context, 'network'));
            await context.docker.containerCreator.remove('solidbench-server');
        }
    }
}
exports.ExperimentSolidBench = ExperimentSolidBench;
//# sourceMappingURL=ExperimentSolidBench.js.map