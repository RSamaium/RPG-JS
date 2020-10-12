import { merge } from './common'
import { EfficiencyOptions } from './efficiency'
import { Effect } from './effect'
import { ParamsModifier } from './item'

interface StateOptions extends EfficiencyOptions {
    name: string,
    description?: string
    effects?: [Effect]
    paramsModifier?: ParamsModifier
}

export function State(options: StateOptions) {
    return merge(options, 'state')
}