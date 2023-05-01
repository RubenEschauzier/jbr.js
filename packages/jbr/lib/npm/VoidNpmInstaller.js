"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoidNpmInstaller = void 0;
/**
 * A dummy npm installer that does not install anything.
 */
class VoidNpmInstaller {
    async install(cwd, packages) {
        // Do nothing
    }
}
exports.VoidNpmInstaller = VoidNpmInstaller;
//# sourceMappingURL=VoidNpmInstaller.js.map