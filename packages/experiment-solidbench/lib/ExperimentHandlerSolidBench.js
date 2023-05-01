"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperimentHandlerSolidBench = void 0;
const Path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const jbr_1 = require("jbr");
const solidbench_1 = require("solidbench");
const ExperimentSolidBench_1 = require("./ExperimentSolidBench");
/**
 * An experiment handler for the SolidBench social network benchmark.
 */
class ExperimentHandlerSolidBench extends jbr_1.ExperimentHandler {
    constructor() {
        super('solidbench', ExperimentSolidBench_1.ExperimentSolidBench.name);
    }
    getDefaultParams(experimentPaths) {
        return {
            scale: '0.1',
            configGenerateAux: 'input/config-enhancer.json',
            configFragment: 'input/config-fragmenter.json',
            configFragmentAux: 'input/config-fragmenter-auxiliary.json',
            configQueries: 'input/config-queries.json',
            configServer: 'input/config-server.json',
            validationParamsUrl: solidbench_1.Templates.VALIDATION_PARAMS_URL,
            configValidation: 'input/config-validation.json',
            hadoopMemory: '4G',
            dockerfileServer: 'input/dockerfiles/Dockerfile-server',
            endpointUrl: 'http://localhost:3001/sparql',
            serverPort: 3000,
            serverLogLevel: 'info',
            serverBaseUrl: 'http://solidbench-server:3000/',
            serverResourceConstraints: {
                '@type': 'StaticDockerResourceConstraints',
                cpu_percentage: 100,
            },
            queryRunnerReplication: 3,
            queryRunnerWarmupRounds: 1,
            queryRunnerRecordTimestamps: true,
            queryRunnerRecordHttpRequests: true,
            queryRunnerUpQuery: `SELECT * WHERE { <http://solidbench-server:3000/pods/00000000000000000933/profile/card#me> a ?o } LIMIT 1`,
            queryRunnerUrlParamsInit: {},
            queryRunnerUrlParamsRun: {},
        };
    }
    getHookNames() {
        return ['hookSparqlEndpoint'];
    }
    async init(experimentPaths, experiment) {
        // Copy config templates
        await Promise.all([
            fs.copyFile(solidbench_1.Templates.ENHANCEMENT_CONFIG, Path.join(experimentPaths.root, experiment.configGenerateAux)),
            fs.copyFile(solidbench_1.Templates.FRAGMENT_CONFIG, Path.join(experimentPaths.root, experiment.configFragment)),
            fs.copyFile(solidbench_1.Templates.ENHANCEMENT_FRAGMENT_CONFIG, Path.join(experimentPaths.root, experiment.configFragmentAux)),
            fs.copyFile(solidbench_1.Templates.QUERY_CONFIG, Path.join(experimentPaths.root, experiment.configQueries)),
            fs.copyFile(solidbench_1.Templates.SERVER_CONFIG, Path.join(experimentPaths.root, experiment.configServer)),
            fs.copyFile(solidbench_1.Templates.VALIDATION_CONFIG, Path.join(experimentPaths.root, experiment.configValidation)),
        ]);
        // Create Dockerfile for server
        await fs.mkdir(Path.join(experimentPaths.input, 'dockerfiles'));
        await fs.copyFile(Path.join(__dirname, 'templates', 'dockerfiles', 'Dockerfile-server'), Path.join(experimentPaths.input, 'dockerfiles', 'Dockerfile-server'));
        await experiment.replaceBaseUrlInDir(experimentPaths.root);
    }
}
exports.ExperimentHandlerSolidBench = ExperimentHandlerSolidBench;
//# sourceMappingURL=ExperimentHandlerSolidBench.js.map