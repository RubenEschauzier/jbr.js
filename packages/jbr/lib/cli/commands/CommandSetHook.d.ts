import type { Argv } from 'yargs';
export declare const command = "set-hook <hook> <handler>";
export declare const desc = "Provide a handler for a hook in an experiment";
export declare const builder: (yargs: Argv<any>) => Argv<any>;
export declare const handler: (argv: Record<string, any>) => Promise<void>;
