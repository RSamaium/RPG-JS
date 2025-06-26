import { signal } from "@signe/reactive";
import { id, sync } from "@signe/sync";
import { RpgCommonPlayer } from "../Player";

export class Item {
    @id() id = signal('');
    @sync() name = signal('');
    @sync() description = signal('');
    @sync() price = signal(0);
    @sync() quantity = signal(1);
    // is not use client side
    atk = 0
    pdef = 0
    sdef = 0
    // --

    onAdd: (player: RpgCommonPlayer) => void = () => {};

    constructor(data: any) {
        this.description.set(data.description);
        this.price.set(data.price);
        this.atk = data.atk;
        this.pdef = data.pdef;
        this.sdef = data.sdef;
        this.onAdd = data.onAdd?.bind(this) ?? (() => {});
    }
}
