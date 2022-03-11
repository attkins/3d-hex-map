import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { HEX_MODEL, loadModel, loadModels } from './model-loader';
import { AnimationMixer, Camera, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { Renderer } from 'leaflet';


let camera: PerspectiveCamera, scene: Scene, renderer: WebGLRenderer;

const mixers: AnimationMixer[] = [];

const clock = new THREE.Clock();

let controls: OrbitControls;

/**
 * inits scene
 */
const init = (): void => {
    const container: HTMLElement | null = document.getElementById( 'container' );

    if (!container) {
        return;
    }

    camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 5000 );
    camera.position.set( 50, 60, 50 );

    scene = new THREE.Scene();
    scene.background = new THREE.Color().setHSL( 0.6, 0, 1 );
    scene.fog = new THREE.Fog( scene.background, 1, 5000 );

    // LIGHTS

    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
    hemiLight.color.setHSL( 0.6, 1, 0.6 );
    hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
    hemiLight.position.set( 0, 50, 0 );
    scene.add( hemiLight );

    const hemiLightHelper = new THREE.HemisphereLightHelper( hemiLight, 10 );
    scene.add( hemiLightHelper );

    const dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    dirLight.color.setHSL( 0.1, 1, 0.95 );
    dirLight.position.set( - 1, 1.75, 1 );
    dirLight.position.multiplyScalar( 30 );
    scene.add( dirLight );

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

    const dirLightHelper = new THREE.DirectionalLightHelper( dirLight, 10 );
    scene.add( dirLightHelper );

    // GROUND

    const groundGeo = new THREE.PlaneGeometry( 10000, 10000 );
    const groundMat = new THREE.MeshLambertMaterial( { color: 0xffffff } );
    groundMat.color.setHSL( 0.095, 1, 0.75 );

    const ground = new THREE.Mesh( groundGeo, groundMat );
    ground.position.y = - 3;
    ground.rotation.x = - Math.PI / 2;
    ground.receiveShadow = true;
    scene.add( ground );

    // SKYDOME

   const uniforms = {
        'topColor': { value: new THREE.Color( 0x0077ff ) },
        'bottomColor': { value: new THREE.Color( 0xffffff ) },
        'offset': { value: 33 },
        'exponent': { value: 0.6 }
    };
    uniforms[ 'topColor' ].value.copy( hemiLight.color );

    scene.fog.color.copy( uniforms[ 'bottomColor' ].value );

    const skyGeo = new THREE.SphereGeometry( 4000, 32, 15 );
    const skyMat = new THREE.ShaderMaterial( {
        uniforms: uniforms,
        vertexShader:   document.getElementById('vertexShader')?.textContent || '',
        fragmentShader: document.getElementById('fragmentShader')?.textContent || '',
        side: THREE.BackSide
    });

    const sky = new THREE.Mesh( skyGeo, skyMat );
    scene.add( sky );

    // MODEL

    loadModels(scene);

    // RENDERER

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;

    //

    window.addEventListener('resize', onWindowResize);

    // CONTROLS
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
}

const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
};

const animate = () => {
    requestAnimationFrame( animate );
    controls.update();
    render();
};

const render = () => {
    const delta = clock.getDelta();
    for ( let i = 0; i < mixers.length; i ++ ) {
        mixers[ i ].update( delta );
    }
    renderer.render( scene, camera );
};

init();
animate();

    

    /*
    loadModel(HEX_MODEL.OBJ_CASTLE, scene);


    const loader = new GLTFLoader()
    loader.load(
        './models/detail_hill.gltf.glb',
        function (gltf) {
            scene.add(gltf.scene)
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        (error) => {
            console.log(error)
        }
    )
    
    loader.load(
        './models/hex_forest.gltf.glb',
        function (gltf) {
            gltf.scene.traverse(function (child) {
                child.position.x = 0.48;
                child.position.z = 0.48;
            })
            scene.add(gltf.scene)
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        (error) => {
            console.log(error)
        }
    )
    
    loader.load(
        './models/castle.gltf.glb',
        function (gltf) {
            gltf.scene.traverse(function (child) {
                child.position.x = -0.48;
                child.position.z = -0.48;
            })
            scene.add(gltf.scene)
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        (error) => {
            console.log(error)
        }
    )
    */






//const controls = new OrbitControls(camera, renderer.domElement)
//controls.enableDamping = true
//
//function animate() {
//    requestAnimationFrame(animate);
//    //controls.update();
//    render();
//    //stats.update()
//}
