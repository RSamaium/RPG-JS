import { RpgReactContext } from '@rpgjs/client/react'
import { useContext } from 'react'

export default function tooltip({ spriteData }) {
    const context = useContext(RpgReactContext)
    return (
        <span className="tooltip tooltip-effect">
            {spriteData.position.x}, {spriteData.position.y}
	    </span>
    )
}

tooltip.rpgAttachToSprite = true