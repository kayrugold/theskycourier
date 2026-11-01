// Three.js otherwise traverses every hidden skeleton on every rendered frame.
// These actor roots have no independently visible children or shadow passes.
export function cullHiddenTransforms(group){
 const update=group.updateMatrixWorld;
 group.updateMatrixWorld=function(force){if(this.visible)update.call(this,force);};
 return group;
}
