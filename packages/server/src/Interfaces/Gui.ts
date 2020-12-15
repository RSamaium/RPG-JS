export interface IGui {
    open(...any): Promise<any>
    close?()
}