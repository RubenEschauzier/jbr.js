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
exports.DockerContainerCreator = void 0;
const fs = __importStar(require("fs-extra"));
const DockerContainerHandler_1 = require("./DockerContainerHandler");
/**
 * Conveniently create a Docker container.
 */
class DockerContainerCreator {
    constructor(dockerode) {
        this.dockerode = dockerode;
    }
    /**
     * Start a container.
     * @param options Container options
     */
    async start(options) {
        var _a;
        // Initialize Docker container
        const container = await this.dockerode.createContainer({
            name: options.containerName,
            Hostname: options.containerName,
            Image: options.imageName,
            Tty: true,
            Cmd: options.cmdArgs,
            AttachStdout: true,
            AttachStderr: true,
            HostConfig: Object.assign(Object.assign({}, options.hostConfig || {}), (_a = options.resourceConstraints) === null || _a === void 0 ? void 0 : _a.toHostConfig()),
        });
        // Attach output of container
        const out = await container.attach({
            stream: true,
            stdout: true,
            stderr: true,
        });
        // Create container handler
        const containerHandler = new DockerContainerHandler_1.DockerContainerHandler(container, out, options.statsFilePath);
        // Write output to logs
        if (options.logFilePath) {
            // eslint-disable-next-line import/namespace
            out.pipe(fs.createWriteStream(options.logFilePath, 'utf8'));
        }
        else {
            out.resume();
        }
        // Start container
        await container.start();
        return containerHandler;
    }
    /**
     * Remove a container
     * @param name A container name
     */
    async remove(name) {
        const container = this.dockerode.getContainer(name);
        if (container) {
            try {
                await container.remove({ force: true });
            }
            catch (_a) {
                // Ignore errors
            }
        }
    }
}
exports.DockerContainerCreator = DockerContainerCreator;
//# sourceMappingURL=DockerContainerCreator.js.map