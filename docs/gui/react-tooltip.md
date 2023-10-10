# Create a GUI attached to a sprite

## Prerequisites

- Know how to create a GUI and add it in the module
- Be comfortable with React
- Since v4.1.0

::: warning
**Experimental Feature**: This feature is still in its experimental stage and may not be stable.
:::

## Example

This is very useful to make more advanced interactions on a sprite. For example, display a tooltip or additional interactive displays.

<Video src="/assets/rpgjs_gui.mp4" /> 

## Create Component

<PathTo to="guiDir" file="tooltip.tsx" />

```tsx
export default function MyTooltip({ spriteData }) {
    return (
        <span className="tooltip">
            {spriteData.position.x}, {spriteData.position.y}
	    </span>
    )
}

MyTooltip.rpgAttachToSprite = true
```

<!--@include: _trigger-tooltip.md-->