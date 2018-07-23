/* global AFRAME */
/**
 * Button Primitive for aframe-material-collection.
 * @namespace aframe-material-collection
 * @primitive a-ui-button
 * @author Shane Harris
 */

module.exports = AFRAME.registerPrimitive('a-ui-button', AFRAME.utils.extendDeep({}, AFRAME.primitives.getMeshMixin(), {
    defaultComponents: {
        geometry: {
            primitive: 'plane',
            width: 0.5,
            height: 0.175
        },
        material: {
            color: '#009688',
            shader: 'flat',
        },
        "ui-btn":{},
        "ui-rounded":{borderRadius:0.0025},
        "ui-ripple":{size:{x:0.5,y:0.175},clampToSquare:true,zIndex:0.001},
        text:{
            font:'roboto',
            align:'center',
            zOffset:0.002,
            wrapCount:10,
            alphaTest:0.4
        }
    },
    mappings: {
        height: 'geometry.height',
        width: 'geometry.width',
        color: 'material.color',
        transparent: 'material.transparent',
        "font-color":'text.color',
        "ripple-color":'ui-ripple.color',
        "text-value": 'text.value',
        disabled:'ui-btn.disabled'
    }
}));