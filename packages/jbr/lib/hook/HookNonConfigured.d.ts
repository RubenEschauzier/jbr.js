import type { ProcessHandler } from '../experiment/ProcessHandler';
import type { ICleanTargets } from '../task/ICleanTargets';
import type { ITaskContext } from '../task/ITaskContext';
import type { Hook } from './Hook';
/**
 * A hook that always errors upon usage.
 *
 * This hook should be used by default for hooks in new experiments, which have not been configured yet.
 */
export declare class HookNonConfigured implements Hook {
    prepare(context: ITaskContext): Promise<void>;
    start(context: ITaskContext): Promise<ProcessHandler>;
    clean(context: ITaskContext, cleanTargets: ICleanTargets): Promise<void>;
    protected makeError(): Error;
}
