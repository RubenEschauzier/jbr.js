"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullFactorialCombinationProvider = void 0;
/**
 * For all the given factor values, provide all possible combinations.
 */
class FullFactorialCombinationProvider {
    /**
     * @param factors A hash of factor keys to an array of factor values. @range {json}
     * @param commonGenerated If the prepare phase is identical across combinations.
     */
    constructor(factors, commonGenerated = false) {
        this.factors = factors;
        this.commonGenerated = commonGenerated;
    }
    getFactorCombinations() {
        // Calculate all matrix combinations
        let combinations = [{}];
        for (const [factor, values] of Object.entries(this.factors)) {
            const combinationsCopies = [];
            for (const value of values) {
                // Make a deep copy of the combinations array
                const combinationsCopy = combinations.map(factorCombination => (Object.assign({}, factorCombination)));
                combinationsCopies.push(combinationsCopy);
                // Set the value in all copies
                for (const combinationCopy of combinationsCopy) {
                    combinationCopy[factor] = value;
                }
            }
            // Update the current combinations
            combinations = combinationsCopies.flat();
        }
        return combinations;
    }
}
exports.FullFactorialCombinationProvider = FullFactorialCombinationProvider;
//# sourceMappingURL=FullFactorialCombinationProvider.js.map