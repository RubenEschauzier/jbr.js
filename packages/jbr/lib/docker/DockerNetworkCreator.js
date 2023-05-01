"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerNetworkCreator = void 0;
const DockerNetworkHandler_1 = require("./DockerNetworkHandler");
/**
 * Conveniently create a Docker network.
 */
class DockerNetworkCreator {
    constructor(dockerode) {
        this.dockerode = dockerode;
    }
    /**
     * Create a network
     * @param options Network options
     */
    async create(options) {
        return new DockerNetworkHandler_1.DockerNetworkHandler(await this.dockerode.createNetwork(options));
    }
    /**
     * Remove a network
     * @param name A network name
     */
    async remove(name) {
        // First prune unused networks
        await this.dockerode.pruneNetworks();
        const network = this.dockerode.getNetwork(name);
        if (network) {
            try {
                await network.remove({ force: true });
            }
            catch (_a) {
                // Ignore errors
            }
        }
    }
}
exports.DockerNetworkCreator = DockerNetworkCreator;
//# sourceMappingURL=DockerNetworkCreator.js.map