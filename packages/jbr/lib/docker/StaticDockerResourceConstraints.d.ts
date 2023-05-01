import type Dockerode from 'dockerode';
import type { DockerResourceConstraints } from './DockerResourceConstraints';
/**
 * Allows constraints to be placed on Docker container resources.
 */
export declare class StaticDockerResourceConstraints implements DockerResourceConstraints {
    static readonly QUANTITY_UNITS: Record<string, number>;
    readonly cpu: IDockerCpuConstraints;
    readonly memory: IDockerMemoryConstraints;
    constructor(cpu: IDockerCpuConstraints, memory: IDockerMemoryConstraints);
    /**
     * Convert a given quantity string (with optional unit) to an absolute number.
     * For example, '10' will be converted to 10, '10k' to '10240', '1m' to 1048576, and so on.
     * @param amount A quantity string.
     */
    static quantityStringToBytes(amount: string): number;
    /**
     * Obtain a Docker HostConfig object from the current constraints.
     */
    toHostConfig(): Dockerode.HostConfig;
}
export interface IDockerCpuConstraints {
    /**
     * Percentage (0-100) of the total CPU power that can be used.
     * E.g. when fully consuming 4 cores, this value must be set to 100.
     */
    percentage?: number;
}
export interface IDockerMemoryConstraints {
    /**
     * Memory usage limit, e.g. '10m', '1g'.
     */
    limit?: string;
}
