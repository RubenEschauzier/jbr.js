import type { IExperimentPaths } from 'jbr';
import { HookHandler } from 'jbr';
import { HookSparqlEndpointLdf } from './HookSparqlEndpointLdf';
/**
 * Hook handler for a LDF server-based SPARQL endpoint.
 */
export declare class HookHandlerSparqlEndpointLdf extends HookHandler<HookSparqlEndpointLdf> {
    constructor();
    getDefaultParams(experimentPaths: IExperimentPaths): Record<string, any>;
    getSubHookNames(): string[];
    init(experimentPaths: IExperimentPaths, hookHandler: HookSparqlEndpointLdf): Promise<void>;
}
