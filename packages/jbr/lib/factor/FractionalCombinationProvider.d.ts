import type { CombinationProvider, FactorCombination } from './CombinationProvider';
/**
 * A direct provision of an array of factor combination.
 */
export declare class FractionalCombinationProvider implements CombinationProvider {
    private readonly combinations;
    readonly commonGenerated: boolean;
    /**
     * @param combinations An array of hashes containing factors mapped to values. @range {json}
     * @param commonGenerated If the prepare phase is identical across combinations.
     */
    constructor(combinations: FactorCombination[], commonGenerated?: boolean);
    getFactorCombinations(): FactorCombination[];
}
