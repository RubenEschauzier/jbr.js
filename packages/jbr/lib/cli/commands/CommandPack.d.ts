import type { Argv } from 'yargs';
export declare const command = "pack";
export declare const desc = "Create an archive of the experiment output";
export declare const builder: (yargs: Argv<any>) => Argv<any>;
export declare const handler: (argv: Record<string, any>) => Promise<void>;
