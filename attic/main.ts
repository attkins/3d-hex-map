import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight, Color } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { HexMap } from './map/hex-map';
import { Input } from './core/input';
import { init } from './map/map';

const scene = new Scene();
scene.background = new Color(0x87ceeb);

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 25);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.enableDamping = true;
controls.target.set(0, 0, 0);

const ambient = new AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dir = new DirectionalLight(0xffffff, 1.2);
dir.position.set(10, 20, 10);
scene.add(dir);

init(scene); // wenn initMap schon async ist

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
