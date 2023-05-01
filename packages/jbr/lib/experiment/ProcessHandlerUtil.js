"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureProcessHandler = void 0;
/**
 * Utility function to register the proper handlers for a process
 * to make sure it handles early termination and cleanup correctly.
 * The returned callback must be invoked at the end of the experiment, to stop the process in a clean manner.
 * @param processHandler The process handler.
 * @param context The task context.
 */
function secureProcessHandler(processHandler, context) {
    // Register termination listener
    function terminationHandler(processName) {
        context.logger.error(`A process (${processName}) exited prematurely.\nThis may be caused by a software error or insufficient memory being allocated to the system or Docker.\nPlease inspect the output logs for more details.`);
        context.closeExperiment();
    }
    processHandler.addTerminationHandler(terminationHandler);
    // Register cleanup handler
    async function cleanupHandler() {
        // Before closing the actual processes, remove the termination listener
        // Otherwise, we may run into infinite loops
        processHandler.removeTerminationHandler(terminationHandler);
        // Close the processes
        await processHandler.close();
    }
    context.cleanupHandlers.push(cleanupHandler);
    // Return a callback to safely close the process
    return async () => {
        // Remove termination listener
        processHandler.removeTerminationHandler(terminationHandler);
        // Close process
        await cleanupHandler();
    };
}
exports.secureProcessHandler = secureProcessHandler;
//# sourceMappingURL=ProcessHandlerUtil.js.map