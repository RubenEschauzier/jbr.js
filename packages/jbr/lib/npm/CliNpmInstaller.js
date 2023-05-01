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
exports.CliNpmInstaller = void 0;
const spawn = __importStar(require("cross-spawn"));
const ErrorHandled_1 = require("../cli/ErrorHandled");
/**
 * Installs npm packages by invoking the CLI.
 */
class CliNpmInstaller {
    constructor(context, nextVersion) {
        this.context = context;
        this.nextVersion = nextVersion;
    }
    async install(cwd, packages, scopeError) {
        // Append next tag if needed
        if (this.nextVersion) {
            packages = packages.map(pckg => `${pckg}@next`);
        }
        const { error, status, stderr } = spawn.sync('npm', [
            'install',
            ...packages,
            ...this.nextVersion ? ['--legacy-peer-deps'] : [],
        ], {
            stdio: 'pipe',
            encoding: 'utf8',
            cwd,
        });
        if (error) {
            throw error;
        }
        if (status !== 0) {
            try {
                const allPackages = await this.fetchPackageNames(scopeError);
                this.context.logger.warn(`\nInstalling package failed.\nAvailable types on npm:\n`);
                for (const pckg of allPackages) {
                    this.context.logger.warn(`  - ${pckg.name.slice(`@${scopeError}/`.length)} - ${pckg.description} - ${pckg.link}`);
                }
                this.context.logger.warn(``);
            }
            catch (_a) {
                // Ignore fetch errors
            }
            throw new ErrorHandled_1.ErrorHandled(`Npm installation failed for ${packages.join(', ')}:\n${stderr}`);
        }
    }
    async fetchPackageNames(scope) {
        const response = await fetch(`https://api.npms.io/v2/search?q=scope:${scope}`);
        const data = await response.json();
        return data.results.map((result) => ({
            name: result.package.name,
            description: result.package.description,
            link: result.package.links.npm,
        }));
    }
}
exports.CliNpmInstaller = CliNpmInstaller;
//# sourceMappingURL=CliNpmInstaller.js.map