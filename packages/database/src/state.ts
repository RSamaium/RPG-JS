import { merge } from './common'

interface StateOptions {
    name: string,
    restriction?: string
}

export function State(options: StateOptions) {
    return merge(options, 'state')
}