interface PlayerWeb3Options {
    walletAdress: string;
}

export class PlayerWeb3Manager {
    public readonly walletAdress: string;

    constructor({ walletAdress }: PlayerWeb3Options) {
        this.walletAdress = walletAdress;
    }
}