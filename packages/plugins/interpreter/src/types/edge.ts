export interface Edge {
    [blockId: string]: string | string[] | { blocks: { blockId: string, handle: string }[] }
}