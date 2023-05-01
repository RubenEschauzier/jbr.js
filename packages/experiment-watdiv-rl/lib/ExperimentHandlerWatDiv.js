"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperimentHandlerWatDiv = void 0;
const jbr_1 = require("jbr");
const ExperimentWatDiv_1 = require("./ExperimentWatDiv");
/**
 * An experiment handler for the LDBC SNB Decentralized benchmark.
 */
class ExperimentHandlerWatDiv extends jbr_1.ExperimentHandler {
    constructor() {
        super('watdiv-rl', ExperimentWatDiv_1.ExperimentWatDiv.name);
    }
    getDefaultParams(experimentPaths) {
        return {
            datasetScale: 1,
            queryCount: 5,
            queryRecurrence: 1,
            generateHdt: true,
            endpointUrl: 'http://localhost:3001/sparql',
            queryRunnerReplication: 3,
            queryRunnerWarmupRounds: 1,
            queryRunnerRecordTimestamps: true,
            queryRunnerRecordHttpRequests: true,
            queryRunnerUrlParamsInit: {},
            queryRunnerUrlParamsRun: {},
        };
    }
    getHookNames() {
        return ['hookSparqlEndpoint'];
    }
    async init(experimentPaths, experiment) {
        // Do nothing
    }
}
exports.ExperimentHandlerWatDiv = ExperimentHandlerWatDiv;
//# sourceMappingURL=ExperimentHandlerWatDiv.js.map