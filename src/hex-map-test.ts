import {
  BackSide,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  WebGLRenderer,
  PCFSoftShadowMap,
  GLSL3,
} from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { init as initMap } from './map';

import vertexShader from './shaders/vertex.glsl?raw';
import fragmentShader from './shaders/fragment.glsl?raw';

console.log('vertexShader type:', typeof vertexShader);
console.log('vertexShader first chars:', vertexShader.slice(0, 20));

let camera: PerspectiveCamera;
let scene: Scene;
let renderer: WebGLRenderer;
let controls: OrbitControls;

const init = (): void => {
  const container = document.getElementById('container');
  if (!container) return;

  // CAMERA
  camera = new PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 5000);
  camera.position.set(-48.87, 4.31, 10.33);

  // SCENE
  scene = new Scene();
  scene.background = new Color().setHSL(0.6, 0, 1);
  scene.fog = new Fog(scene.background, 1, 5000);

  // LIGHTS
  const hemiLight = new HemisphereLight(0xffffff, 0xffffff, 0.6);
  hemiLight.color.setHSL(0.6, 1, 0.6);
  hemiLight.groundColor.setHSL(0.095, 1, 0.75);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff, 1);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(50, 100, 50);
  dirLight.target.position.set(0, 0, 0);
  dirLight.castShadow = true;

  // Shadow camera
  const d = 180; // nicht zu groß, sonst Qualität sinkt
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 500;

  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.bias = -0.0005;

  scene.add(dirLight);
  scene.add(dirLight.target);

  // GROUND
  const ground = new Mesh(new PlaneGeometry(10000, 10000), new MeshLambertMaterial({ color: 0xffffff }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -10;
  ground.receiveShadow = true;
  scene.add(ground);

  // SKYDOME
  const uniforms = {
    topColor: { value: new Color(0x0077ff) },
    bottomColor: { value: new Color(0xffffff) },
    offset: { value: 33 },
    exponent: { value: 0.6 },
  };

  uniforms.topColor.value.copy(hemiLight.color);
  scene.fog.color.copy(uniforms.bottomColor.value);

  const sky = new Mesh(
    new SphereGeometry(4000, 32, 15),
    new ShaderMaterial({
      glslVersion: GLSL3, // <-- hier
      uniforms,
      vertexShader,
      fragmentShader,
      side: BackSide,
    })
  );

  console.log('vertexShader:', vertexShader.slice(0, 120));

  scene.add(sky);

  // RENDERER
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // CONTROLS
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2;

  window.addEventListener('resize', onWindowResize);

  // MAP (lädt Modelle + baut Hexmap)
  initMap(scene);
};

const onWindowResize = (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const animate = (): void => {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};

init();
animate();
