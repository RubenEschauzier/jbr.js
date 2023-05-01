import type { NpmInstaller } from './NpmInstaller';
/**
 * A dummy npm installer that does not install anything.
 */
export declare class VoidNpmInstaller implements NpmInstaller {
    install(cwd: string, packages: string[]): Promise<void>;
}
