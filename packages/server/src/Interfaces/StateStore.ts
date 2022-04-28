export interface IStoreState {
    connect(): Promise<any>
    get(key: string): Promise<string | null>
    set(key: string, val: string): Promise<any>
}