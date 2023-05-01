import type { Argv } from 'yargs';
export declare const command = "init <type> <name>";
export declare const desc = "Initializes a new experiment";
export declare const builder: (yargs: Argv<any>) => Argv<any>;
export declare const handler: (argv: Record<string, any>) => Promise<void>;
