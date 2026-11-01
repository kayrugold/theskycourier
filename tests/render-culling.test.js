import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Object3D} from 'three';
import {cullHiddenTransforms} from '../src/render-culling.js';
test('hidden actor skips bone traversal and restores current transforms when visible',()=>{
 const root=cullHiddenTransforms(new Group()),bone=new Object3D();root.add(bone);
 let calls=0;const update=bone.updateMatrixWorld;bone.updateMatrixWorld=function(force){calls++;update.call(this,force);};
 root.visible=false;root.position.x=10;bone.position.y=3;root.updateMatrixWorld(true);assert.equal(calls,0);
 root.visible=true;root.updateMatrixWorld(true);assert.equal(calls,1);assert.equal(bone.matrixWorld.elements[12],10);assert.equal(bone.matrixWorld.elements[13],3);
});
