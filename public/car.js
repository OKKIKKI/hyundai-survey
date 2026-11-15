import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export async function createCar(canvas,fallback){
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'})}catch{return null}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.05,150);camera.position.set(4.5,1.85,8.3);camera.lookAt(0,.77,.12);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.8;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xe1ecff,0x52647a,2));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-3,6,4);scene.add(key);const rim=new THREE.DirectionalLight(0x8cb4ff,2);rim.position.set(4,3,-3);scene.add(rim);
 const stage=new THREE.Group();scene.add(stage);let model;try{model=(await new GLTFLoader().loadAsync('/assets/hyundai_sedan.glb')).scene}catch{renderer.dispose();return null}stage.add(model);
 // A small reusable sprite pool keeps the exhaust effect lightweight.
 // Model forward is +Z; place the emitter just behind its rear bumper.
 const bounds=new THREE.Box3().setFromObject(model);
 const exhaust=new THREE.Vector3(bounds.max.x*.55,bounds.min.y+.23,bounds.min.z-.06);
 const smokeCanvas=document.createElement('canvas');smokeCanvas.width=smokeCanvas.height=64;
 const smokeContext=smokeCanvas.getContext('2d');
 const smokeGradient=smokeContext.createRadialGradient(32,32,2,32,32,30);
 smokeGradient.addColorStop(0,'rgba(145,155,169,.65)');smokeGradient.addColorStop(.45,'rgba(163,173,185,.36)');smokeGradient.addColorStop(1,'rgba(185,193,204,0)');
 smokeContext.fillStyle=smokeGradient;smokeContext.fillRect(0,0,64,64);
 const smokeTexture=new THREE.CanvasTexture(smokeCanvas);
 const smoke=Array.from({length:16},(_,i)=>{
  const material=new THREE.SpriteMaterial({map:smokeTexture,transparent:true,depthWrite:false,opacity:0,toneMapped:false});
  const sprite=new THREE.Sprite(material);sprite.visible=false;scene.add(sprite);
  return {sprite,birth:.08+i*.033,origin:new THREE.Vector3(),drift:new THREE.Vector3(),emitted:false};
 });
 function clearSmoke(){smoke.forEach(p=>{p.emitted=false;p.sprite.visible=false;p.sprite.material.opacity=0})}
 function updateSmoke(t){
  smoke.forEach((p,i)=>{
   const age=t-p.birth;
   if(age<0||age>.36){p.sprite.visible=false;return}
   if(!p.emitted){
    const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),heading*smooth(Math.min(p.birth/.34,1)));
    const travel=17*Math.max(0,(p.birth-.34)/.66)**2;
    p.origin.copy(exhaust).applyQuaternion(rotation).addScaledVector(dir,travel);
    p.drift.set(0,0,-1).applyQuaternion(rotation);p.emitted=true;
   }
   const life=age/.36;
   p.sprite.visible=true;p.sprite.position.copy(p.origin).addScaledVector(p.drift,life*.7);
   p.sprite.position.y+=life*.35;p.sprite.position.x+=Math.sin(i*2.4)*life*.09;
   p.sprite.scale.setScalar(.16+life*.65);
   p.sprite.material.opacity=.5*Math.sin(Math.PI*Math.min(life*3,1)/2)*(1-life);
  });
 }
 const wheels=['FL','FR','RL','RR'].map(n=>model.getObjectByName('Wheel_'+n)).filter(Boolean),initial=wheels.map(w=>w.quaternion.clone());
 function size(){const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(29/2))*Math.max(1,1.5/camera.aspect)));camera.updateProjectionMatrix();renderer.render(scene,camera)}
 new ResizeObserver(size).observe(canvas);size();fallback.hidden=true;
 const dir=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);dir.y=0;dir.normalize();const heading=Math.atan2(dir.x,dir.z),smooth=t=>t*t*(3-2*t);
 let frame=0;
 function animate(duration,update){cancelAnimationFrame(frame);return new Promise(resolve=>{const start=performance.now();function tick(now){const t=Math.min(1,(now-start)/duration);update(t);renderer.render(scene,camera);if(t<1)frame=requestAnimationFrame(tick);else resolve()}frame=requestAnimationFrame(tick)})}
 function reset(){clearSmoke();stage.position.set(0,0,0);stage.rotation.set(0,0,0);wheels.forEach((w,i)=>w.quaternion.copy(initial[i]));size()}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback.hidden=false;cancelAnimationFrame(frame)});
 let drag = null;
 let canRotate = true;
 canvas.style.touchAction = 'pan-y';
 canvas.style.cursor = 'grab';
 canvas.addEventListener('pointerdown', event => {
  if (!canRotate || drag || event.button !== 0) return;
  drag = { id: event.pointerId, x: event.clientX, angle: stage.rotation.y };
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = 'grabbing';
 });
 canvas.addEventListener('pointermove', event => {
  if (!canRotate || drag?.id !== event.pointerId) return;
  stage.rotation.y = drag.angle + (event.clientX - drag.x) * .012;
  renderer.render(scene, camera);
 });
 canvas.addEventListener('lostpointercapture', event => {
  if (drag?.id !== event.pointerId) return;
  drag = null;
  canvas.style.cursor = canRotate ? 'grab' : '';
 });
 return {depart(){canRotate=false;canvas.style.cursor='';reset();if(matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();return animate(1400,t=>{const turn=Math.min(t/.34,1);stage.rotation.y=heading*smooth(turn);const travel=17*Math.max(0,(t-.34)/.66)**2;stage.position.copy(dir).multiplyScalar(travel);stage.position.y=t<.18?.018*Math.sin(t/.18*Math.PI*4):0;updateSmoke(t);wheels.forEach((w,i)=>{w.quaternion.copy(initial[i]);w.rotateX((w.name.endsWith('R')?-1:1)*travel/.412)})})},arrive(){reset();if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;return animate(800,t=>{const distance=-3*(1-t)**3;stage.position.copy(dir).multiplyScalar(distance);stage.rotation.y=heading*.2*(1-t);wheels.forEach((w,i)=>{w.quaternion.copy(initial[i]);w.rotateX((w.name.endsWith('R')?-1:1)*distance/.412)})})}};
}
