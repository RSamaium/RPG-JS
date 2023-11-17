# Create a GUI attached to a sprite

## Prerequisites

- Know how to create a GUI and add it in the module
- Be comfortable with VueJS

## Preview

<Playground id="232" />

## Goal

This is very useful to make more advanced interactions on a sprite. For example, display a tooltip or additional interactive displays.

<Video src="/assets/rpgjs_gui.mp4" /> 

## The Full GUI

<PathTo to="guiDir" file="tooltip.vue" />

```vue
<template>
	<span class="tooltip tooltip-effect" :class="{ hover }">
		<span class="tooltip-item"></span>
			<span class="tooltip-content clearfix">
				<img :src="image" /><span class="tooltip-text">
					<h2>{{ name }}</h2> By {{ ownerName }}
					<a :href="permalink">See in OpenSea</a>
			</span>
		</span>
	</span>
</template>

<script>
export default {
  name: "my-tooltip",
  rpgAttachToSprite: true,
  props: ["spriteData"],
  inject: ["rpgScene"],
  data() {
    return {
      hover: false,
      image: '',
      name: '',
      ownerName: '',
      permalink: ''
    };
  },
  async mounted() {
    const item = await fetch(`https://testnets-api.opensea.io/api/v1/assets?order_direction=desc&offset=0&limit=1`)
        .then((res) => res.json())
        .then((res) => res.assets[0])
    this.image = item.image_preview_url
    this.name = item.name
    this.ownerName = item.owner.user.username
    this.permalink = item.permalink
    const sprite = this.rpgScene().getSprite(this.spriteData.id)
    console.log(sprite)
    setTimeout(() => { this.hover = true }, 100)
  },
  methods: {},
};
</script>

<style lang="scss">
.tooltip {
	display: inline;
	position: relative;
	z-index: 999;
    left: 16px;
}

/* Gap filler */

.tooltip-item::after {
	content: '';
	position: absolute;
	width: 360px;
	height: 20px;
	bottom: 100%;
	left: 50%;
	pointer-events: none;
	transform: translateX(-50%);
}

.tooltip:hover .tooltip-item::after {
	pointer-events: auto;
}

/* Tooltip */

.tooltip-content {
	position: absolute;
	z-index: 9999;
	width: 360px;
	left: 50%;
	margin: 0 0 20px -180px;
	bottom: 100%;
	text-align: left;
	font-size: 0.765em;
	line-height: 1.4;
	box-shadow: -5px -5px 15px rgba(48,54,61,0.2);
	background: #2a3035;
	opacity: 0;
	cursor: default;
	pointer-events: none;
}

.tooltip-effect .tooltip-content {
	transform: translate3d(0,-10px,0);
	transition: opacity 0.3s, transform 0.3s;
}

.tooltip.hover .tooltip-content {
	pointer-events: auto;
	opacity: 1;
	transform: translate3d(0,0,0) rotate3d(0,0,0,0);
}
/* Arrow */

.tooltip-content::after {
	content: '';
	top: 100%;
	left: 50%;
	border: solid transparent;
	height: 0;
	width: 0;
	position: absolute;
	pointer-events: none;
	border-color: transparent;
	border-top-color: #2a3035;
	border-width: 10px;
	margin-left: -10px;
}

/* Tooltip content*/

.tooltip-content img {
	position: relative;
	max-width: 300px;
	display: block;
	float: left;
	margin-right: 1em;
}

.tooltip-text {
	line-height: 1.35;
	display: block;
	padding: 1.31em 1.21em 1.21em 0;
	color: #fff;
    font-family: Lato;
}

.tooltip-text a {
	font-weight: bold;
    color: #fff;
}
</style>
```

To attach a GUI to a sprite, you can add the property `rpgAttachToSprite: true` in the component. In this way, you will be able to retrieve the data from the sprite with `props: ["spriteData"]`

:::tip Warning 
Attention, if you want to see the modifications of the sprite, don't use `spriteData`, it's just the data sent once when opening the GUI

`spriteData` is an object, not the instance of type `RpgSprite`. If you want to retrieve the instance, you have to retrieve it from the scene with

```ts
const sprite = this.rpgScene().getSprite(this.spriteData.id)
```
:::

<!--@include: _trigger-tooltip.md-->