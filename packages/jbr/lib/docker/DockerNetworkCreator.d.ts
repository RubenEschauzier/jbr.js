import type Dockerode from 'dockerode';
import { DockerNetworkHandler } from './DockerNetworkHandler';
/**
 * Conveniently create a Docker network.
 */
export declare class DockerNetworkCreator {
    private readonly dockerode;
    constructor(dockerode: Dockerode);
    /**
     * Create a network
     * @param options Network options
     */
    create(options: Dockerode.NetworkCreateOptions): Promise<DockerNetworkHandler>;
    /**
     * Remove a network
     * @param name A network name
     */
    remove(name: string): Promise<void>;
}
