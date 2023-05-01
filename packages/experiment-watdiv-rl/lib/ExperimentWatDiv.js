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
exports.ExperimentWatDiv = void 0;
const Path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const jbr_1 = require("jbr");
const sparql_benchmark_runner_1 = require("sparql-benchmark-runner");
/**
 * An experiment instance for the LDBC SNB Decentralized benchmark.
 */
class ExperimentWatDiv {
    /**
     * @param datasetScale
     * @param queryCount
     * @param queryRecurrence
     * @param generateHdt
     * @param hookSparqlEndpoint
     * @param endpointUrl
     * @param queryRunnerReplication
     * @param queryRunnerWarmupRounds
     * @param queryRunnerRecordTimestamps
     * @param queryRunnerRecordHttpRequests
     * @param queryRunnerUrlParamsInit - @range {json}
     * @param queryRunnerUrlParamsRun - @range {json}
     * @param queryTimeoutFallback
     */
    constructor(datasetScale, queryCount, queryRecurrence, generateHdt, hookSparqlEndpoint, endpointUrl, queryRunnerReplication, queryRunnerWarmupRounds, queryRunnerRecordTimestamps, queryRunnerRecordHttpRequests, queryRunnerUrlParamsInit, queryRunnerUrlParamsRun, queryTimeoutFallback) {
        this.datasetScale = datasetScale;
        this.queryCount = queryCount;
        this.queryRecurrence = queryRecurrence;
        this.generateHdt = generateHdt;
        this.hookSparqlEndpoint = hookSparqlEndpoint;
        this.endpointUrl = endpointUrl;
        this.queryRunnerReplication = queryRunnerReplication;
        this.queryRunnerWarmupRounds = queryRunnerWarmupRounds;
        this.queryRunnerRecordTimestamps = queryRunnerRecordTimestamps;
        this.queryRunnerRecordHttpRequests = queryRunnerRecordHttpRequests;
        this.queryRunnerUrlParamsInit = queryRunnerUrlParamsInit;
        this.queryRunnerUrlParamsRun = queryRunnerUrlParamsRun;
        this.queryTimeoutFallback = queryTimeoutFallback;
    }
    async prepare(context, forceOverwriteGenerated) {
        // Prepare hook
        await this.hookSparqlEndpoint.prepare(context, forceOverwriteGenerated);
        // Ensure logs directory exists
        await fs.ensureDir(Path.join(context.experimentPaths.output, 'logs'));
        // Prepare dataset
        context.logger.info(`Generating WatDiv dataset and queries`);
        if (!forceOverwriteGenerated && await fs.pathExists(Path.join(context.experimentPaths.generated, 'dataset.nt'))) {
            context.logger.info(`  Skipped`);
        }
        else {
            await context.docker.imagePuller.pull({ repoTag: ExperimentWatDiv.DOCKER_IMAGE_WATDIV });
            await (await context.docker.containerCreator.start({
                imageName: ExperimentWatDiv.DOCKER_IMAGE_WATDIV,
                cmdArgs: ['-s', String(this.datasetScale), '-q', String(this.queryCount), '-r', String(this.queryRecurrence)],
                hostConfig: {
                    Binds: [
                        `${context.experimentPaths.generated}:/output`,
                    ],
                },
                logFilePath: Path.join(context.experimentPaths.output, 'logs', 'watdiv-generation.txt'),
            })).join();
        }
        if (this.generateHdt) {
            // Create HDT file
            context.logger.info(`Converting WatDiv dataset to HDT`);
            if (!forceOverwriteGenerated &&
                await fs.pathExists(Path.join(context.experimentPaths.generated, 'dataset.hdt'))) {
                context.logger.info(`  Skipped`);
            }
            else {
                // Pull HDT Docker image
                await context.docker.imagePuller.pull({ repoTag: ExperimentWatDiv.DOCKER_IMAGE_HDT });
                // Remove any existing index files
                await fs.rm(Path.join(context.experimentPaths.generated, 'dataset.hdt.index.v1-1'), { force: true });
                // Convert dataset to HDT
                await (await context.docker.containerCreator.start({
                    imageName: ExperimentWatDiv.DOCKER_IMAGE_HDT,
                    cmdArgs: ['rdf2hdt', '/output/dataset.nt', '/output/dataset.hdt'],
                    hostConfig: {
                        Binds: [
                            `${context.experimentPaths.generated}:/output`,
                        ],
                    },
                    logFilePath: Path.join(context.experimentPaths.output, 'logs', 'watdiv-hdt.txt'),
                })).join();
                // Generate HDT index file
                await (await context.docker.containerCreator.start({
                    imageName: ExperimentWatDiv.DOCKER_IMAGE_HDT,
                    cmdArgs: ['hdtSearch', '/output/dataset.hdt', '-q', '0'],
                    hostConfig: {
                        Binds: [
                            `${context.experimentPaths.generated}:/output`,
                        ],
                    },
                    logFilePath: Path.join(context.experimentPaths.output, 'logs', 'watdiv-hdt-index.txt'),
                })).join();
            }
        }
    }
    async run(context) {
        // Setup SPARQL endpoint
        const endpointProcessHandler = await this.hookSparqlEndpoint.start(context);
        const closeProcess = (0, jbr_1.secureProcessHandler)(endpointProcessHandler, context);
        // Initiate SPARQL benchmark runner
        let stopEndpointStats;
        const results = await new sparql_benchmark_runner_1.SparqlBenchmarkRunner({
            endpoint: this.endpointUrl,
            querySets: await (0, sparql_benchmark_runner_1.readQueries)(Path.join(context.experimentPaths.generated, 'queries')),
            replication: this.queryRunnerReplication,
            warmup: this.queryRunnerWarmupRounds,
            timestampsRecording: this.queryRunnerRecordTimestamps,
            logger: (message) => process.stderr.write(message),
            additionalUrlParamsInit: new URLSearchParams(this.queryRunnerUrlParamsInit),
            additionalUrlParamsRun: new URLSearchParams(this.queryRunnerUrlParamsRun),
            timeout: this.queryTimeoutFallback,
        }).run({
            async onStart() {
                // Collect stats
                stopEndpointStats = await endpointProcessHandler.startCollectingStats();
                // Breakpoint right before starting queries.
                if (context.breakpointBarrier) {
                    await context.breakpointBarrier();
                }
            },
            async onStop() {
                stopEndpointStats();
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
        // Close process safely
        await closeProcess();
    }
    async clean(context, cleanTargets) {
        await this.hookSparqlEndpoint.clean(context, cleanTargets);
    }
}
exports.ExperimentWatDiv = ExperimentWatDiv;
ExperimentWatDiv.DOCKER_IMAGE_WATDIV = `comunica/watdiv@sha256:2fac67737d6dddd75ea023b90bba2a1c7432a00e233791a802e374e3d2a8ec3b`;
ExperimentWatDiv.DOCKER_IMAGE_HDT = `rdfhdt/hdt-cpp:v1.3.3`;
//# sourceMappingURL=ExperimentWatDiv.js.map