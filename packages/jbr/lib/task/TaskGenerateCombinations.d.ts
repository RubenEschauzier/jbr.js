import type { FactorCombination } from '../factor/CombinationProvider';
import type { ITaskContext } from './ITaskContext';
/**
 * Generates combinations based on an experiment template and a combination provider.
 */
export declare class TaskGenerateCombinations {
    private readonly context;
    constructor(context: ITaskContext);
    generate(): Promise<FactorCombination[]>;
    /**
     * Instantiate all variables in the form of %FACTOR-variablename% based on the given factor combination.
     * @param combination A factor combination that maps variable names to values.
     * @param experimentId The experiment id.
     * @param combinationId The combination id.
     * @param content The string content in which variable names should be replaced.
     */
    static applyFactorCombination(combination: FactorCombination, experimentId: string, combinationId: string, content: string): string;
    /**
     * Copy all files in the given source to the given destination.
     * Additionally, apply the given mapper function on all copied file contents.
     * @param sourceDirectory Directory to copy from.
     * @param destinationDirectory Directory to copy to.
     * @param mapper A function to map file contents when copying.
     */
    static copyFiles(sourceDirectory: string, destinationDirectory: string, mapper: (value: string) => string): Promise<void>;
}
