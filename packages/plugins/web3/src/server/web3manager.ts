interface PlayerWeb3Options {
    address: string;
}

export class PlayerWeb3Manager {
    public readonly walletAdress: string;

    constructor({ address }: PlayerWeb3Options) {
        this.walletAdress = address;
    }
}