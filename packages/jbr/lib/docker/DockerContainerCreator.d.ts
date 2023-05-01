import type Dockerode from 'dockerode';
import { DockerContainerHandler } from './DockerContainerHandler';
import type { DockerResourceConstraints } from './DockerResourceConstraints';
/**
 * Conveniently create a Docker container.
 */
export declare class DockerContainerCreator {
    private readonly dockerode;
    constructor(dockerode: Dockerode);
    /**
     * Start a container.
     * @param options Container options
     */
    start(options: IDockerContainerCreatorArgs): Promise<DockerContainerHandler>;
    /**
     * Remove a container
     * @param name A container name
     */
    remove(name: string): Promise<void>;
}
export interface IDockerContainerCreatorArgs {
    containerName?: string;
    imageName: string;
    cmdArgs?: string[];
    resourceConstraints?: DockerResourceConstraints;
    hostConfig?: Dockerode.HostConfig;
    logFilePath?: string;
    statsFilePath?: string;
}
