import type Dockerode from 'dockerode';
import type { ProcessHandler } from '../experiment/ProcessHandler';
/**
 * Process handler for Docker networks
 */
export declare class DockerNetworkHandler implements ProcessHandler {
    readonly network: Dockerode.Network;
    constructor(network: Dockerode.Network);
    close(): Promise<void>;
    join(): Promise<void>;
    startCollectingStats(): Promise<() => void>;
    addTerminationHandler(handler: (processName: string, error?: Error) => void): void;
    removeTerminationHandler(handler: (processName: string, error?: Error) => void): void;
}
