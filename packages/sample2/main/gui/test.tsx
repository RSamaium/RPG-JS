import { room } from '@rpgjs/client'
import { RpgReactContext, useObjects, useCurrentPlayer } from '@rpgjs/client/react'
import { useContext, useEffect } from 'react'

export default function Test({ gold }) {
    const { rpgCurrentPlayer } = useContext(RpgReactContext)

    useEffect(() => {
        rpgCurrentPlayer.subscribe(({ object }) => {
            console.log('frontend', object.items);
        })
    }, [])

    return <>test</>
}