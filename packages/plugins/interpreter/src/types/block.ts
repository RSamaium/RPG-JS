import type { RpgPlayer } from "@rpgjs/server";
import { Group } from "./group";
import { Observable } from "rxjs";

export type BlockExecuteReturn = string | undefined | never;
export type BlockExecute = Observable<BlockExecuteReturn> | Promise<BlockExecuteReturn> | BlockExecuteReturn;

export interface Block {
    id: string;
    group: Group;
    title: string;
    description: string;
    display: Array<string | DisplayItem>;
    schema: SchemaInterface;
    execute: (player: RpgPlayer, dataBlock: any) => BlockExecute;
}

export interface Parameters extends SchemaInterface {}

interface DisplayItem {
    key: string;
    hasHandles: boolean;
}

interface SchemaInterface {
    type: string;
    properties: {
        [key: string]: PropertyInterface;
    };
    required?: string[];
}

interface PropertyInterface {
    type: string;
    title: string;
    items?: {
        title: string;
        type: string;
    };
    defaultAddValue?: string;
    minItems?: number;
    maxItems?: number;
}