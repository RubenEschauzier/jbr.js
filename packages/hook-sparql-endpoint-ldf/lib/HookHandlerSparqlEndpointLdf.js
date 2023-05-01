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
exports.HookHandlerSparqlEndpointLdf = void 0;
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
const jbr_1 = require("jbr");
const HookSparqlEndpointLdf_1 = require("./HookSparqlEndpointLdf");
/**
 * Hook handler for a LDF server-based SPARQL endpoint.
 */
class HookHandlerSparqlEndpointLdf extends jbr_1.HookHandler {
    constructor() {
        super('sparql-endpoint-ldf', HookSparqlEndpointLdf_1.HookSparqlEndpointLdf.name);
    }
    getDefaultParams(experimentPaths) {
        return {
            dockerfile: 'input/dockerfiles/Dockerfile-ldf-server',
            dockerfileCache: 'input/dockerfiles/Dockerfile-ldf-server-cache',
            resourceConstraints: {
                '@type': 'StaticDockerResourceConstraints',
                cpu_percentage: 100,
            },
            config: 'input/config-ldf-server.json',
            portServer: 2999,
            portCache: 3000,
            workers: 4,
            maxMemory: 8192,
            dataset: 'generated/dataset.hdt',
        };
    }
    getSubHookNames() {
        return ['hookSparqlEndpointLdfEngine'];
    }
    async init(experimentPaths, hookHandler) {
        // Create Dockerfile for server
        if (!await fs.pathExists(path_1.default.join(experimentPaths.input, 'dockerfiles'))) {
            await fs.mkdir(path_1.default.join(experimentPaths.input, 'dockerfiles'));
        }
        await fs.copyFile(path_1.default.join(__dirname, 'templates', 'dockerfiles', 'Dockerfile-ldf-server'), path_1.default.join(experimentPaths.input, 'dockerfiles', 'Dockerfile-ldf-server'));
        await fs.copyFile(path_1.default.join(__dirname, 'templates', 'dockerfiles', 'Dockerfile-ldf-server-cache'), path_1.default.join(experimentPaths.input, 'dockerfiles', 'Dockerfile-ldf-server-cache'));
        // Create config for server
        if (!await fs.pathExists(path_1.default.join(experimentPaths.input))) {
            await fs.mkdir(path_1.default.join(experimentPaths.input));
        }
        await fs.copyFile(path_1.default.join(__dirname, 'templates', 'input', 'config-ldf-server.json'), path_1.default.join(experimentPaths.input, 'config-ldf-server.json'));
        await fs.copyFile(path_1.default.join(__dirname, 'templates', 'input', 'nginx.conf'), path_1.default.join(experimentPaths.input, 'nginx.conf'));
        await fs.copyFile(path_1.default.join(__dirname, 'templates', 'input', 'nginx-default'), path_1.default.join(experimentPaths.input, 'nginx-default'));
    }
}
exports.HookHandlerSparqlEndpointLdf = HookHandlerSparqlEndpointLdf;
//# sourceMappingURL=HookHandlerSparqlEndpointLdf.js.map