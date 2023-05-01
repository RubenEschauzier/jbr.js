"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerContainerHandler = void 0;
const fs_1 = __importDefault(require("fs"));
/**
 * Docker container wrapped in a convenience datastructure.
 */
class DockerContainerHandler {
    constructor(container, outputStream, statsFilePath) {
        this.container = container;
        this.outputStream = outputStream;
        this.ended = false;
        this.outputStream.on('end', () => {
            if (!this.ended && !this.errored) {
                this.onTerminated();
            }
            this.ended = true;
        });
        this.outputStream.on('error', (error) => {
            if (!this.ended && !this.errored) {
                this.onTerminated(error);
            }
            this.errored = error;
        });
        this.statsFilePath = statsFilePath;
        this.terminationHandlers = new Set();
    }
    /**
     * Stop and clean this container
     */
    async close() {
        try {
            await this.container.kill();
        }
        catch (_a) {
            // Ignore error
        }
        try {
            await this.container.remove();
        }
        catch (_b) {
            // Ignore error
        }
    }
    /**
     * Wait until this container is ended.
     */
    async join() {
        if (this.errored) {
            throw this.errored;
        }
        if (!this.ended) {
            await new Promise((resolve, reject) => {
                this.outputStream.on('error', reject);
                this.outputStream.on('end', resolve);
            });
            await this.container.remove();
        }
    }
    async startCollectingStats() {
        // Just consume the stats stream if we don't have a statsFilePath
        if (!this.statsFilePath) {
            const statsStream = await this.container.stats({});
            statsStream.resume();
            return () => {
                statsStream.removeAllListeners('data');
            };
        }
        // Create a CSV file output stream
        const out = fs_1.default.createWriteStream(this.statsFilePath, 'utf8');
        out.write('cpu_percentage,memory,memory_percentage,received,transmitted\n');
        // Read the stats stream
        const statsStream = await this.container.stats({});
        statsStream.setEncoding('utf8');
        let first = true;
        statsStream.on('data', (stats) => {
            const lines = stats.split('\n');
            for (const line of lines) {
                if (line) {
                    // Skip first output, because we don't have a reference to create a delta with (CPU will always be zero)
                    if (first) {
                        first = false;
                        continue;
                    }
                    let data;
                    try {
                        data = JSON.parse(line);
                    }
                    catch (_a) {
                        continue;
                    }
                    // Skip line if network hasn't been set yet, or has been shutdown already
                    if (!data.networks) {
                        continue;
                    }
                    // Calculate CPU percentage
                    let cpuPercentage = 0;
                    const cpuDelta = data.cpu_stats.cpu_usage.total_usage - data.precpu_stats.cpu_usage.total_usage;
                    const systemDelta = data.cpu_stats.system_cpu_usage - data.precpu_stats.system_cpu_usage;
                    if (systemDelta > 0) {
                        cpuPercentage = cpuDelta / systemDelta * 100;
                    }
                    // Calculate memory usage
                    const memory = data.memory_stats.usage;
                    const memoryPercentage = data.memory_stats.usage / data.memory_stats.limit * 100;
                    // Calculate I/O
                    let receivedBytes = 0;
                    let transmittedBytes = 0;
                    for (const network of Object.keys(data.networks)) {
                        receivedBytes += data.networks[network].rx_bytes;
                        transmittedBytes += data.networks[network].tx_bytes;
                    }
                    out.write(`${cpuPercentage},${memory},${memoryPercentage},${receivedBytes},${transmittedBytes}\n`);
                }
            }
        });
        return () => {
            statsStream.removeAllListeners('data');
            out.end();
        };
    }
    addTerminationHandler(handler) {
        this.terminationHandlers.add(handler);
    }
    removeTerminationHandler(handler) {
        this.terminationHandlers.delete(handler);
    }
    onTerminated(error) {
        for (const terminationListener of this.terminationHandlers) {
            terminationListener(`Docker container ${this.container.id}`, error);
        }
    }
}
exports.DockerContainerHandler = DockerContainerHandler;
//# sourceMappingURL=DockerContainerHandler.js.map