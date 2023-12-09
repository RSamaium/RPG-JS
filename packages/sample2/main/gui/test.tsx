import { room } from '@rpgjs/client'
import { RpgReactContext, useEventPropagator } from '@rpgjs/client/react'
import { useContext } from 'react'

export default function Test({ gold }) {
    const { rpgCurrentPlayer } = useContext(RpgReactContext)
    const propagate = useEventPropagator();

    return <div ref={propagate}>test</div>
}