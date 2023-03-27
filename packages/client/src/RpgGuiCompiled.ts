const __sfc__ = {}
import { renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, resolveDynamicComponent as _resolveDynamicComponent, normalizeProps as _normalizeProps, guardReactiveProps as _guardReactiveProps, createBlock as _createBlock, mergeProps as _mergeProps, createCommentVNode as _createCommentVNode, normalizeStyle as _normalizeStyle, createElementVNode as _createElementVNode } from "vue"

const _hoisted_1 = {
    id: "tooltips",
    style: {"position":"absolute","top":"0","left":"0"}
  }
  function render(_ctx, _cache) {
    return (_openBlock(), _createElementBlock("div", {
      onPointerdown: _cache[0] || (_cache[0] = $event => (_ctx.propagate('pointerdown', $event))),
      onPointermove: _cache[1] || (_cache[1] = $event => (_ctx.propagate('pointermove', $event))),
      onPointerleave: _cache[2] || (_cache[2] = $event => (_ctx.propagate('pointerleave', $event))),
      onPointerover: _cache[3] || (_cache[3] = $event => (_ctx.propagate('pointerover', $event))),
      onPointercancel: _cache[4] || (_cache[4] = $event => (_ctx.propagate('pointercancel', $event))),
      onPointerup: _cache[5] || (_cache[5] = $event => (_ctx.propagate('pointerup', $event)))
    }, [
      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.fixedGui, (ui) => {
        return (_openBlock(), _createElementBlock(_Fragment, null, [
          (ui.display)
            ? (_openBlock(), _createBlock(_resolveDynamicComponent(ui.name), _normalizeProps(_mergeProps({ key: 0 }, ui.data)), null, 16 /* FULL_PROPS */))
            : _createCommentVNode("v-if", true)
        ], 64 /* STABLE_FRAGMENT */))
      }), 256 /* UNKEYED_FRAGMENT */)),
      _createElementVNode("div", _hoisted_1, [
        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.attachedGui, (ui) => {
          return (_openBlock(), _createElementBlock(_Fragment, null, [
            (ui.display)
              ? (_openBlock(true), _createElementBlock(_Fragment, { key: 0 }, _renderList(_ctx.tooltipFilter(_ctx.tooltips, ui), (tooltip) => {
                  return (_openBlock(), _createElementBlock("div", {
                    style: _normalizeStyle(_ctx.tooltipPosition(tooltip.position))
                  }, [
                    (_openBlock(), _createBlock(_resolveDynamicComponent(ui.name), _mergeProps({ ...ui.data, spriteData: tooltip }, {
                      ref_for: true,
                      ref: ui.name
                    }), null, 16 /* FULL_PROPS */))
                  ], 4 /* STYLE */))
                }), 256 /* UNKEYED_FRAGMENT */))
              : _createCommentVNode("v-if", true)
          ], 64 /* STABLE_FRAGMENT */))
        }), 256 /* UNKEYED_FRAGMENT */))
      ])
    ], 32 /* HYDRATE_EVENTS */))
  }
