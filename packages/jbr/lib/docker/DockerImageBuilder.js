"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerImageBuilder = void 0;
/**
 * Conveniently build a Docker image.
 */
class DockerImageBuilder {
    constructor(dockerode) {
        this.dockerode = dockerode;
    }
    /**
     * Build an image
     * @param options Image options
     */
    async build(options) {
        const buildStream = await this.dockerode.buildImage({
            context: options.cwd,
            src: [options.dockerFile, ...options.auxiliaryFiles || []],
        }, {
            // eslint-disable-next-line id-length
            t: options.imageName,
            buildargs: options.buildArgs,
            dockerfile: options.dockerFile,
        });
        const output = await new Promise((resolve, reject) => {
            this.dockerode.modem.followProgress(buildStream, (err, res) => err ? reject(err) : resolve(res), (data) => {
                if (data.stream && data.stream.trim()) {
                    options.logger.verbose(data.stream.trim());
                }
            });
        });
        if (output.length > 0 && output[output.length - 1].error) {
            throw new Error(output[output.length - 1].error);
        }
    }
    /**
     * Obtain a proper image name within the current jbr experiment context with the given suffix.
     * @param context A task context.
     * @param suffix A suffix to add to the image name.
     */
    getImageName(context, suffix) {
        let pathContext = context.experimentName;
        if ('combination' in context.experimentPaths) {
            pathContext = `${pathContext}-combination_${context.experimentPaths.combination}`;
        }
        return `jbr-experiment-${pathContext}-${suffix}`;
    }
}
exports.DockerImageBuilder = DockerImageBuilder;
//# sourceMappingURL=DockerImageBuilder.js.map