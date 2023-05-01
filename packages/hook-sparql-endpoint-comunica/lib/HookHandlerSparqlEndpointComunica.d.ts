import type { IExperimentPaths } from 'jbr';
import { HookHandler } from 'jbr';
import { HookSparqlEndpointComunica } from './HookSparqlEndpointComunica';
/**
 * Hook handler for a Comunica-based SPARQL endpoint.
 */
export declare class HookHandlerSparqlEndpointComunica extends HookHandler<HookSparqlEndpointComunica> {
    constructor();
    getDefaultParams(experimentPaths: IExperimentPaths): Record<string, any>;
    getSubHookNames(): string[];
    init(experimentPaths: IExperimentPaths, hookHandler: HookSparqlEndpointComunica): Promise<void>;
}
