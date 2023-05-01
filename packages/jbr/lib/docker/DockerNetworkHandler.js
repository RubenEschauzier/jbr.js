"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerNetworkHandler = void 0;
/**
 * Process handler for Docker networks
 */
class DockerNetworkHandler {
    constructor(network) {
        this.network = network;
    }
    async close() {
        await this.network.remove({ force: true });
    }
    async join() {
        // Do nothing
    }
    async startCollectingStats() {
        return () => {
            // Do nothing
        };
    }
    addTerminationHandler(handler) {
        // Do nothing
    }
    removeTerminationHandler(handler) {
        // Do nothing
    }
}
exports.DockerNetworkHandler = DockerNetworkHandler;
//# sourceMappingURL=DockerNetworkHandler.js.map