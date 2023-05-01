"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandled = void 0;
/**
 * An error that should be considered a non-programming error,
 * which can be handled by simply printing the message on the CLI.
 */
class ErrorHandled extends Error {
    constructor(message) {
        super(message);
        this.handled = true;
    }
}
exports.ErrorHandled = ErrorHandled;
//# sourceMappingURL=ErrorHandled.js.map