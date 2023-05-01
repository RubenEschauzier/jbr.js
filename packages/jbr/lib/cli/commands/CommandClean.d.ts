import type { Argv } from 'yargs';
export declare const command = "clean";
export declare const desc = "Cleans up an experiment";
export declare const builder: (yargs: Argv<any>) => Argv<any>;
export declare const handler: (argv: Record<string, any>) => Promise<void>;
