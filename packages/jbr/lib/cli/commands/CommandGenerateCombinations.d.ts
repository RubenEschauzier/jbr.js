import type { Argv } from 'yargs';
export declare const command = "generate-combinations";
export declare const desc = "Generate combinations of experiment templates";
export declare const builder: (yargs: Argv<any>) => Argv<any>;
export declare const handler: (argv: Record<string, any>) => Promise<void>;
