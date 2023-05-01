/**
 * An error that should be considered a non-programming error,
 * which can be handled by simply printing the message on the CLI.
 */
export declare class ErrorHandled extends Error {
    readonly handled = true;
    constructor(message: string);
}
