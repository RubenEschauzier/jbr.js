"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FractionalCombinationProvider = void 0;
/**
 * A direct provision of an array of factor combination.
 */
class FractionalCombinationProvider {
    /**
     * @param combinations An array of hashes containing factors mapped to values. @range {json}
     * @param commonGenerated If the prepare phase is identical across combinations.
     */
    constructor(combinations, commonGenerated = false) {
        this.combinations = combinations;
        this.commonGenerated = commonGenerated;
    }
    getFactorCombinations() {
        return this.combinations;
    }
}
exports.FractionalCombinationProvider = FractionalCombinationProvider;
//# sourceMappingURL=FractionalCombinationProvider.js.map