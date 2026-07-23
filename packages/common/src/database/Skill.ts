import { signal } from "@signe/reactive";
import { id, sync } from "@signe/sync";
import type { RpgWritableSignal } from "../foundation";

const gameplaySignal = signal as <T>(value: T) => RpgWritableSignal<T>;

export interface SkillData {
    id: string;
    name: string;
    description: string;
    spCost: number;
    hitRate: number;
    power: number;
    coefficient: Record<string, number>;
    icon: string
}

export class Skill {
    @id() id = gameplaySignal('');
    @sync() name = gameplaySignal('');
    description = gameplaySignal('');
    @sync() spCost = gameplaySignal(0);
    @sync() icon = gameplaySignal('')
    hitRate = gameplaySignal(0);
    power = gameplaySignal(0);
    coefficient = gameplaySignal<Record<string, number>>({});

    constructor(data?: SkillData) {
        this.id.set(data?.id ?? '');
        this.name.set(data?.name ?? '');
        this.description.set(data?.description ?? '');
        this.spCost.set(data?.spCost ?? 0);
        this.hitRate.set(data?.hitRate ?? 0);
        this.power.set(data?.power ?? 0);
        this.coefficient.set(data?.coefficient ?? {});
        this.icon.set(data?.icon ?? '')
    }
}
