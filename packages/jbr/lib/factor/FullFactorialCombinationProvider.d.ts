import type { CombinationProvider, FactorCombination } from './CombinationProvider';
/**
 * For all the given factor values, provide all possible combinations.
 */
export declare class FullFactorialCombinationProvider implements CombinationProvider {
    private readonly factors;
    readonly commonGenerated: boolean;
    /**
     * @param factors A hash of factor keys to an array of factor values. @range {json}
     * @param commonGenerated If the prepare phase is identical across combinations.
     */
    constructor(factors: Record<string, any[]>, commonGenerated?: boolean);
    getFactorCombinations(): FactorCombination[];
}
