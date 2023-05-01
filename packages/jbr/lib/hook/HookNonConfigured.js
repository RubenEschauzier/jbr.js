"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookNonConfigured = void 0;
const CommandSetHook_1 = require("../cli/commands/CommandSetHook");
const ErrorHandled_1 = require("../cli/ErrorHandled");
/**
 * A hook that always errors upon usage.
 *
 * This hook should be used by default for hooks in new experiments, which have not been configured yet.
 */
class HookNonConfigured {
    async prepare(context) {
        throw this.makeError();
    }
    async start(context) {
        throw this.makeError();
    }
    async clean(context, cleanTargets) {
        throw this.makeError();
    }
    makeError() {
        return new ErrorHandled_1.ErrorHandled(`Unable to run an experiment with a non-configured hook ('ExperimentHookNonConfigured').
Initialize this hook via 'jbr ${CommandSetHook_1.command}'`);
    }
}
exports.HookNonConfigured = HookNonConfigured;
//# sourceMappingURL=HookNonConfigured.js.map