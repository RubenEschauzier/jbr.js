import type { ITaskContext } from '../../lib/task/ITaskContext';
import type { NpmInstaller } from './NpmInstaller';
/**
 * Installs npm packages by invoking the CLI.
 */
export declare class CliNpmInstaller implements NpmInstaller {
    private readonly context;
    private readonly nextVersion;
    constructor(context: ITaskContext, nextVersion: boolean);
    install(cwd: string, packages: string[], scopeError: string): Promise<void>;
    fetchPackageNames(scope: string): Promise<{
        name: string;
        description: string;
        link: string;
    }[]>;
}
