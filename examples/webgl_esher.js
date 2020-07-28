import * as THREE from '../build/three.module.js';

import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';

import Stats from './jsm/libs/stats.module.js';
import { GUI } from './jsm/libs/dat.gui.module.js';

var container

let scene, camera, renderer, controls, hemiLight, light;
let mirrorSphere, mirrorSphereCamera;

let stats;
let gui;
const conf = {
  fov: 60,
  cubeRenderTargetSize: 512
}

function init() {
  container = document.getElementById( 'container' );

  //
  // conf GUI
  //

  gui = new GUI();

  gui.add(conf, 'fov', 1, 150).onChange(function (fov) {
    camera.fov = fov
    camera.updateProjectionMatrix()
  });
  gui.add(conf, 'cubeRenderTargetSize', 1, 1024).onChange(function (size) {
    cubeRenderTarget.setSize(size, size)
  });
  gui.open();

  //
  // scene
  //

  scene = new THREE.Scene();
  window.scene = scene

  scene.background = new THREE.Color(0xdddddd);
  /* scene.background = new THREE.CubeTextureLoader()
    .setPath( 'skybox/' )
    .load( [
      'posx.jpg',
      'negx.jpg',
      'posy.jpg',
      'negy.jpg',
      'posz.jpg',
      'negz.jpg'
    ] );*/

  //
  // 🎥 camera
  //

  camera = new THREE.PerspectiveCamera(conf.fov, window.innerWidth/window.innerHeight, 0.001, 5000);
  window.camera = camera

  camera.position.set(.05,.93,2.75);
  camera.lookAt(scene.position)
  
  scene.add(new THREE.AxesHelper(1));

  // light = new THREE.SpotLight(0xffffff);
  // light.position.set(50,50,50);
  // light.castShadow = true;
  // light.shadow.bias = 0.0001;
  // light.shadow.mapSize.width = 1024*4;
  // light.shadow.mapSize.height = 1024*4;
  // light.shadow.camera.near = 0.5;       // default 0.5
  // light.shadow.camera.far = 5      // default 500
  light = new THREE.DirectionalLight(0xffffff)
  light.castShadow = true;
  light.shadow.bias = 0.0001;
  //light.shadow.mapSize.width = 1024*4;
  //light.shadow.mapSize.height = 1024*4;
  light.position.set(50,50,50)
  scene.add( light );

  hemiLight = new THREE.HemisphereLight(0xcccccc, 0xffffff, 1); // ground, sky, intensity
  scene.add(hemiLight);

  //
  // renderer
  //

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  window.renderer = renderer

  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  //renderer.toneMapping = THREE.ReinhardToneMapping;
  //renderer.toneMappingExposure = 2.3;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  stats = new Stats();
	container.appendChild( stats.dom );

  //
  // 🕹 orbit controls
  //

  controls = new OrbitControls(camera, renderer.domElement);
  window.controls = controls

  controls.addEventListener( 'change', render ); // use if there is no animation loop
  controls.minDistance = 0;
  controls.maxDistance = 10;
  // controls.target.set(0,0,0);
  controls.update();

  //
  // 📦 GLTF scene loader
  //

  new GLTFLoader().load('models/gltf/esher.gltf', gltf => {
    console.log('gltf loaded', gltf)

    gltf.scene.traverse(n => { 
      if (n.isMesh) {
        console.log('mesh', n)
        n.castShadow = true; 
        n.receiveShadow = true;

        //if (n.material.map) n.material.map.anisotropy = 1;

        if (n.name === 'Sphere') {
          mirrorSphere = n;

          const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(conf.cubeRenderTargetSize)
          window.cubeRenderTarget = cubeRenderTarget
          mirrorSphereCamera = new THREE.CubeCamera(.1, 5000, cubeRenderTarget) // near, far
          window.mirrorSphereCamera = mirrorSphereCamera;
          scene.add(mirrorSphereCamera)

          const mirrorSphereMaterial = new THREE.MeshBasicMaterial({envMap: cubeRenderTarget.texture});
          n.material = mirrorSphereMaterial;

          if (controls) {
            controls.target.copy(n.position); // orbit controls lookAt the sphere
            controls.update();
          }
        }
      }
    });

    scene.add(gltf.scene)
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize, false);

function animate() {
  requestAnimationFrame(animate);

  //light.position.set( 
  //  camera.position.x + 10,
  //  camera.position.y + 10,
  //  camera.position.z + 10,
  //);

  render()

  stats.update(); // fps stats
}

function render() {
  if (mirrorSphere && mirrorSphereCamera) {
    mirrorSphere.visible = false; // hide sphere before taking cube photos
    mirrorSphereCamera.position.copy(mirrorSphere.position) // move the cube camera to the center of the sphere
    mirrorSphereCamera.update(renderer, scene) // shoot cube photos
    mirrorSphere.visible = true; // reveal back the sphere
  }
  
  // required if controls.enableDamping or controls.autoRotate are set to true
	//controls.update();
  renderer.render(scene, camera);
}

init();
animate();