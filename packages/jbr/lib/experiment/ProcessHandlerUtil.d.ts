import type { ITaskContext } from '../task/ITaskContext';
import type { ProcessHandler } from './ProcessHandler';
/**
 * Utility function to register the proper handlers for a process
 * to make sure it handles early termination and cleanup correctly.
 * The returned callback must be invoked at the end of the experiment, to stop the process in a clean manner.
 * @param processHandler The process handler.
 * @param context The task context.
 */
export declare function secureProcessHandler(processHandler: ProcessHandler, context: ITaskContext): () => Promise<void>;
