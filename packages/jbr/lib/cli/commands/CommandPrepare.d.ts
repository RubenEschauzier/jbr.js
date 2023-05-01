import type { Argv } from 'yargs';
export declare const command = "prepare";
export declare const desc = "Prepare data for the current experiment";
export declare const builder: (yargs: Argv<any>) => Argv<any>;
export declare const handler: (argv: Record<string, any>) => Promise<void>;
