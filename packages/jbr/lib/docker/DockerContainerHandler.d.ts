/// <reference types="node" />
import type Dockerode from 'dockerode';
import type { ProcessHandler } from '../experiment/ProcessHandler';
/**
 * Docker container wrapped in a convenience datastructure.
 */
export declare class DockerContainerHandler implements ProcessHandler {
    readonly container: Dockerode.Container;
    readonly outputStream: NodeJS.ReadableStream;
    readonly statsFilePath?: string;
    readonly terminationHandlers: Set<(processName: string, error?: Error) => void>;
    ended: boolean;
    errored?: Error;
    constructor(container: Dockerode.Container, outputStream: NodeJS.ReadableStream, statsFilePath?: string);
    /**
     * Stop and clean this container
     */
    close(): Promise<void>;
    /**
     * Wait until this container is ended.
     */
    join(): Promise<void>;
    startCollectingStats(): Promise<() => void>;
    addTerminationHandler(handler: (processName: string, error?: Error) => void): void;
    removeTerminationHandler(handler: (processName: string, error?: Error) => void): void;
    protected onTerminated(error?: Error): void;
}
