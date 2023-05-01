import type Dockerode from 'dockerode';
/**
 * Conveniently pull a Docker image.
 */
export declare class DockerImagePuller {
    private readonly dockerode;
    constructor(dockerode: Dockerode);
    /**
     * Pull an image
     * @param options Image options
     */
    pull(options: IDockerImagePullerArgs): Promise<void>;
}
export interface IDockerImagePullerArgs {
    repoTag: string;
}
