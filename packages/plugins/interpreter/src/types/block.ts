import type { RpgPlayer } from "@rpgjs/server";
import { Group } from "./group";
import { Observable } from "rxjs";

export interface Block {
    id: string;
    group: Group;
    title: string;
    description: string;
    display: Array<string | DisplayItem>;
    schema: SchemaInterface;
    execute: (player: RpgPlayer, dataBlock: any) => Observable<any> | Promise<any> | void;
}

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