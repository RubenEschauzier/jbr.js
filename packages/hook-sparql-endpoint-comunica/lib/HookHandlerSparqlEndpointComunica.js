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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookHandlerSparqlEndpointComunica = void 0;
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
const jbr_1 = require("jbr");
const HookSparqlEndpointComunica_1 = require("./HookSparqlEndpointComunica");
/**
 * Hook handler for a Comunica-based SPARQL endpoint.
 */
class HookHandlerSparqlEndpointComunica extends jbr_1.HookHandler {
    constructor() {
        super('sparql-endpoint-comunica', HookSparqlEndpointComunica_1.HookSparqlEndpointComunica.name);
    }
    getDefaultParams(experimentPaths) {
        return {
            dockerfileClient: 'input/dockerfiles/Dockerfile-client',
            resourceConstraints: {
                '@type': 'StaticDockerResourceConstraints',
                cpu_percentage: 100,
            },
            configClient: 'input/config-client.json',
            contextClient: 'input/context-client.json',
            clientPort: 3001,
            clientLogLevel: 'info',
            queryTimeout: 300,
            maxMemory: 8192,
        };
    }
    getSubHookNames() {
        return [];
    }
    async init(experimentPaths, hookHandler) {
        // Create Dockerfile for client
        if (!await fs.pathExists(path_1.default.join(experimentPaths.input, 'dockerfiles'))) {
            await fs.mkdir(path_1.default.join(experimentPaths.input, 'dockerfiles'));
        }
        await fs.copyFile(path_1.default.join(__dirname, 'templates', 'dockerfiles', 'Dockerfile-client'), path_1.default.join(experimentPaths.input, 'dockerfiles', 'Dockerfile-client'));
        // Create config for client
        if (!await fs.pathExists(path_1.default.join(experimentPaths.input))) {
            await fs.mkdir(path_1.default.join(experimentPaths.input));
        }
        await fs.copyFile(path_1.default.join(__dirname, 'templates', 'input', 'config-client.json'), path_1.default.join(experimentPaths.input, 'config-client.json'));
        await fs.copyFile(path_1.default.join(__dirname, 'templates', 'input', 'context-client.json'), path_1.default.join(experimentPaths.input, 'context-client.json'));
    }
}
exports.HookHandlerSparqlEndpointComunica = HookHandlerSparqlEndpointComunica;
//# sourceMappingURL=HookHandlerSparqlEndpointComunica.js.map