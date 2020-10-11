import { merge } from './common'
import { EfficiencyOptions } from './efficiency'
import { Effect } from './effect'

interface StateOptions extends EfficiencyOptions {
    name: string,
    effects?: [Effect]
}

export function State(options: StateOptions) {
    return merge(options, 'state')
}