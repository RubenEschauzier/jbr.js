import type Dockerode from 'dockerode';
import type { Logger } from 'winston';
import type { ITaskContext } from '../../lib/task/ITaskContext';
/**
 * Conveniently build a Docker image.
 */
export declare class DockerImageBuilder {
    private readonly dockerode;
    constructor(dockerode: Dockerode);
    /**
     * Build an image
     * @param options Image options
     */
    build(options: IDockerImageBuilderArgs): Promise<void>;
    /**
     * Obtain a proper image name within the current jbr experiment context with the given suffix.
     * @param context A task context.
     * @param suffix A suffix to add to the image name.
     */
    getImageName(context: ITaskContext, suffix: string): string;
}
export interface IDockerImageBuilderArgs {
    cwd: string;
    dockerFile: string;
    auxiliaryFiles?: string[];
    imageName: string;
    buildArgs?: Record<string, string>;
    logger: Logger;
}
