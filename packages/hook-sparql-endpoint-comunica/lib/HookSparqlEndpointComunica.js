"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookSparqlEndpointComunica = void 0;
const path_1 = __importDefault(require("path"));
/**
 * A hook instance for a Comunica-based SPARQL endpoint.
 */
class HookSparqlEndpointComunica {
    constructor(dockerfileClient, resourceConstraints, configClient, contextClient, clientPort, clientLogLevel, queryTimeout, maxMemory) {
        this.dockerfileClient = dockerfileClient;
        this.resourceConstraints = resourceConstraints;
        this.configClient = configClient;
        this.contextClient = contextClient;
        this.clientPort = clientPort;
        this.clientLogLevel = clientLogLevel;
        this.queryTimeout = queryTimeout;
        this.maxMemory = maxMemory;
    }
    getDockerImageName(context) {
        return context.docker.imageBuilder.getImageName(context, `sparql-endpoint-comunica`);
    }
    async prepare(context, forceOverwriteGenerated) {
        // Build client Dockerfile
        await context.docker.imageBuilder.build({
            cwd: context.experimentPaths.root,
            dockerFile: this.dockerfileClient,
            auxiliaryFiles: [this.configClient],
            imageName: this.getDockerImageName(context),
            buildArgs: {
                CONFIG_CLIENT: this.configClient,
                QUERY_TIMEOUT: `${this.queryTimeout}`,
                MAX_MEMORY: `${this.maxMemory}`,
                LOG_LEVEL: this.clientLogLevel,
            },
            logger: context.logger,
        });
    }
    async start(context, options) {
        var _a;
        return await context.docker.containerCreator.start({
            containerName: 'comunica',
            imageName: this.getDockerImageName(context),
            resourceConstraints: this.resourceConstraints,
            hostConfig: {
                Binds: [
                    `${path_1.default.join(context.experimentPaths.root, this.contextClient)}:/tmp/context.json`,
                ],
                PortBindings: {
                    '3000/tcp': [
                        { HostPort: `${this.clientPort}` },
                    ],
                },
                NetworkMode: (_a = options === null || options === void 0 ? void 0 : options.docker) === null || _a === void 0 ? void 0 : _a.network,
            },
            logFilePath: path_1.default.join(context.experimentPaths.output, 'logs', 'sparql-endpoint-comunica.txt'),
            statsFilePath: path_1.default.join(context.experimentPaths.output, 'stats-sparql-endpoint-comunica.csv'),
        });
    }
    async clean(context, cleanTargets) {
        if (cleanTargets.docker) {
            await context.docker.containerCreator.remove('comunica');
        }
    }
}
exports.HookSparqlEndpointComunica = HookSparqlEndpointComunica;
//# sourceMappingURL=HookSparqlEndpointComunica.js.map