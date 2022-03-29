import {
    BackSide,
    Color,
    DirectionalLight,
    DirectionalLightHelper,
    Fog,
    HemisphereLight,
    HemisphereLightHelper,
    Mesh,
    MeshLambertMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Scene,
    ShaderMaterial,
    SphereGeometry,
    sRGBEncoding,
    WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { init as initMap } from './map';

let camera: PerspectiveCamera;
let scene: Scene;
let renderer: WebGLRenderer;
let controls: OrbitControls;

/**
 * inits scene
 */
const init = (): void => {
    const container: HTMLElement | null = document.getElementById('container');

    if (!container) {
        return;
    }

    camera = new PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 5000);
    //camera.position.set(50, 60, 50);
    // macro position
    // camera.position.set(-25, 3.4, -9.9);
    // overview slightly from above
    camera.position.set(-48.87240121521194, 4.3125335835219305, 10.337305019800793);

    scene = new Scene();
    scene.background = new Color().setHSL(0.6, 0, 1);
    scene.fog = new Fog(scene.background, 1, 5000);

    // LIGHTS

    const hemiLight = new HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const hemiLightHelper = new HemisphereLightHelper(hemiLight, 10);
    // scene.add(hemiLightHelper);

    const dirLight = new DirectionalLight(0xffffff, 1);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(- 1, 1.75, 1);
    dirLight.position.multiplyScalar(30);
    scene.add(dirLight);

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    const d = 50;

    dirLight.shadow.camera.left = - d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = - d;

    dirLight.shadow.camera.far = 3500;
    dirLight.shadow.bias = - 0.0001;

    const dirLightHelper = new DirectionalLightHelper(dirLight, 10);
    // scene.add(dirLightHelper);

    // GROUND

    const groundGeo = new PlaneGeometry(10000, 10000);
    const groundMat = new MeshLambertMaterial({ color: 0xffffff });
    groundMat.color.setHSL(0.095, 1, 0.75);

    const ground = new Mesh(groundGeo, groundMat);
    ground.position.y = - 10;
    ground.rotation.x = - Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // SKYDOME

    const uniforms = {
        'topColor': { value: new Color(0x0077ff) },
        'bottomColor': { value: new Color(0xffffff) },
        'offset': { value: 33 },
        'exponent': { value: 0.6 }
    };
    uniforms['topColor'].value.copy(hemiLight.color);

    scene.fog.color.copy(uniforms['bottomColor'].value);

    const skyGeo = new SphereGeometry(4000, 32, 15);
    const skyMat = new ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById('vertexShader')?.textContent || '',
        fragmentShader: document.getElementById('fragmentShader')?.textContent || '',
        side: BackSide
    });

    const sky = new Mesh(skyGeo, skyMat);
    scene.add(sky);

    // RENDERER

    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    renderer.outputEncoding = sRGBEncoding;
    renderer.shadowMap.enabled = true;

    //

    window.addEventListener('resize', onWindowResize);

    // CONTROLS

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true;
    // stay with the camera over the horizon
    controls.maxPolarAngle = Math.PI / 2;

    // MAP
    initMap(scene);
};

const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    render();
};

const render = () => {
    renderer.render(scene, camera);
};

init();
animate();
