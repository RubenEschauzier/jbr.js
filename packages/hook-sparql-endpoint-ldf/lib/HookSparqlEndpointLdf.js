"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookSparqlEndpointLdf = void 0;
const path_1 = __importDefault(require("path"));
const jbr_1 = require("jbr");
/**
 * A hook instance for a LDF server-based SPARQL endpoint.
 */
class HookSparqlEndpointLdf {
    constructor(dockerfile, dockerfileCache, resourceConstraints, config, portServer, portCache, workers, maxMemory, dataset, hookSparqlEndpointLdfEngine) {
        this.dockerfile = dockerfile;
        this.dockerfileCache = dockerfileCache;
        this.resourceConstraints = resourceConstraints;
        this.config = config;
        this.portServer = portServer;
        this.portCache = portCache;
        this.workers = workers;
        this.maxMemory = maxMemory;
        this.dataset = dataset;
        this.hookSparqlEndpointLdfEngine = hookSparqlEndpointLdfEngine;
    }
    getDockerImageName(context, type) {
        return context.docker.imageBuilder.getImageName(context, `sparql-endpoint-ldf-${type}`);
    }
    async prepare(context, forceOverwriteGenerated) {
        // Build server Dockerfile
        context.logger.info(`Building LDF server Docker image`);
        await context.docker.imageBuilder.build({
            cwd: context.experimentPaths.root,
            dockerFile: this.dockerfile,
            auxiliaryFiles: [this.config],
            imageName: this.getDockerImageName(context, 'server'),
            buildArgs: {
                SERVER_CONFIG: this.config,
                SERVER_WORKERS: `${this.workers}`,
                MAX_MEMORY: `${this.maxMemory}`,
            },
            logger: context.logger,
        });
        // Build cache Dockerfile
        context.logger.info(`Building LDF server cache Docker image`);
        await context.docker.imageBuilder.build({
            cwd: context.experimentPaths.root,
            dockerFile: this.dockerfileCache,
            imageName: this.getDockerImageName(context, 'cache'),
            logger: context.logger,
        });
        // Prepare LDF engine
        context.logger.info(`Preparing LDF engine hook`);
        await this.hookSparqlEndpointLdfEngine.prepare(context, forceOverwriteGenerated);
    }
    async start(context, options) {
        var _a, _b;
        // Create shared network
        const networkHandler = ((_a = options === null || options === void 0 ? void 0 : options.docker) === null || _a === void 0 ? void 0 : _a.network) ?
            undefined :
            await context.docker.networkCreator.create({ Name: this.getDockerImageName(context, 'network') });
        const network = ((_b = options === null || options === void 0 ? void 0 : options.docker) === null || _b === void 0 ? void 0 : _b.network) || networkHandler.network.id;
        // Determine dataset path
        let datasetPath = this.dataset;
        if (datasetPath.startsWith('generated/')) {
            datasetPath = path_1.default.join(context.experimentPaths.generated, datasetPath.slice(10));
        }
        else {
            datasetPath = path_1.default.join(context.experimentPaths.root, this.dataset);
        }
        // Start LDF server
        const serverHandler = await context.docker.containerCreator.start({
            containerName: 'ldfserver',
            imageName: this.getDockerImageName(context, 'server'),
            resourceConstraints: this.resourceConstraints,
            hostConfig: {
                Binds: [
                    `${datasetPath}:/data/dataset.hdt`,
                    `${datasetPath}.index.v1-1:/data/dataset.hdt.index.v1-1`,
                ],
                PortBindings: {
                    '3000/tcp': [
                        { HostPort: `${this.portServer}` },
                    ],
                },
                NetworkMode: network,
            },
            logFilePath: path_1.default.join(context.experimentPaths.output, 'logs', 'sparql-endpoint-ldf-server.txt'),
            statsFilePath: path_1.default.join(context.experimentPaths.output, 'stats-sparql-endpoint-ldf-server.csv'),
        });
        // Start cache proxy
        const cacheHandler = await context.docker.containerCreator.start({
            containerName: 'cache',
            imageName: this.getDockerImageName(context, 'cache'),
            resourceConstraints: this.resourceConstraints,
            hostConfig: {
                Binds: [
                    // Ideally, we do this at build time, but impossible due to https://github.com/apocas/dockerode/issues/553
                    `${path_1.default.join(context.experimentPaths.input, 'nginx-default')}:/etc/nginx/sites-enabled/default`,
                    `${path_1.default.join(context.experimentPaths.input, 'nginx.conf')}:/etc/nginx/nginx.conf`,
                ],
                PortBindings: {
                    '80/tcp': [
                        { HostPort: `${this.portCache}` },
                    ],
                },
                NetworkMode: network,
            },
            logFilePath: path_1.default.join(context.experimentPaths.output, 'logs', 'sparql-endpoint-ldf-cache.txt'),
            statsFilePath: path_1.default.join(context.experimentPaths.output, 'stats-sparql-endpoint-ldf-cache.csv'),
        });
        // Start LDF engine
        const ldfEngineHandler = await this.hookSparqlEndpointLdfEngine.start(context, { docker: { network } });
        return new jbr_1.ProcessHandlerComposite([
            ldfEngineHandler,
            cacheHandler,
            serverHandler,
            ...networkHandler ? [networkHandler] : [],
        ]);
    }
    async clean(context, cleanTargets) {
        await this.hookSparqlEndpointLdfEngine.clean(context, cleanTargets);
        if (cleanTargets.docker) {
            await context.docker.networkCreator.remove(this.getDockerImageName(context, 'network'));
            await context.docker.containerCreator.remove('ldfserver');
            await context.docker.containerCreator.remove('cache');
        }
    }
}
exports.HookSparqlEndpointLdf = HookSparqlEndpointLdf;
//# sourceMappingURL=HookSparqlEndpointLdf.js.map