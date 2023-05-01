"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerImagePuller = void 0;
/**
 * Conveniently pull a Docker image.
 */
class DockerImagePuller {
    constructor(dockerode) {
        this.dockerode = dockerode;
    }
    /**
     * Pull an image
     * @param options Image options
     */
    async pull(options) {
        const buildStream = await this.dockerode.pull(options.repoTag);
        await new Promise((resolve, reject) => {
            this.dockerode.modem.followProgress(buildStream, (err, res) => err ? reject(err) : resolve(res));
        });
    }
}
exports.DockerImagePuller = DockerImagePuller;
//# sourceMappingURL=DockerImagePuller.js.map