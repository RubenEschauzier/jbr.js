import type { ProcessHandler } from './ProcessHandler';
/**
 * A process handler that combines an array of process handlers.
 */
export declare class ProcessHandlerComposite implements ProcessHandler {
    private readonly processHandlers;
    constructor(processHandlers: ProcessHandler[]);
    close(): Promise<void>;
    join(): Promise<void>;
    startCollectingStats(): Promise<() => void>;
    addTerminationHandler(handler: (processName: string, error?: Error) => void): void;
    removeTerminationHandler(handler: (processName: string, error?: Error) => void): void;
}
