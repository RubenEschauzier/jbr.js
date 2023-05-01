"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessHandlerComposite = void 0;
/**
 * A process handler that combines an array of process handlers.
 */
class ProcessHandlerComposite {
    constructor(processHandlers) {
        this.processHandlers = processHandlers;
    }
    async close() {
        const errors = [];
        for (const handler of this.processHandlers) {
            try {
                await handler.close();
            }
            catch (error) {
                errors.push(error);
            }
        }
        if (errors.length > 0) {
            throw new Error(errors.map(error => error.message).join(', '));
        }
    }
    async join() {
        for (const handler of this.processHandlers) {
            await handler.join();
        }
    }
    async startCollectingStats() {
        const callbacks = await Promise.all(this.processHandlers
            .map(processHandler => processHandler.startCollectingStats()));
        return () => {
            for (const cb of callbacks) {
                cb();
            }
        };
    }
    addTerminationHandler(handler) {
        for (const processHandler of this.processHandlers) {
            processHandler.addTerminationHandler(handler);
        }
    }
    removeTerminationHandler(handler) {
        for (const processHandler of this.processHandlers) {
            processHandler.removeTerminationHandler(handler);
        }
    }
}
exports.ProcessHandlerComposite = ProcessHandlerComposite;
//# sourceMappingURL=ProcessHandlerComposite.js.map