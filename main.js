import * as THREE from 'three';
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene and Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-200, 10, 20);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Adjust color and intensity as needed
scene.add(ambientLight);

const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight1.position.set(5, 10, 5).normalize();
scene.add(directionalLight1);

// Renderer
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

// Load Horse Model
const horses = [
  { id: 1, color: 'brown', modelPath: 'assets/brown_horse/scene.gltf' },
  { id: 2, color: 'white', modelPath: 'assets/white_horse/scene.gltf' },
  { id: 3, color: 'black', modelPath: 'assets/black_horse/scene.gltf' },
  { id: 4, color: 'brown', modelPath: 'assets/brown_horse/scene.gltf' },
  { id: 5, color: 'black', modelPath: 'assets/black_horse/scene.gltf' },
  { id: 6, color: 'brown', modelPath: 'assets/brown_horse/scene.gltf' },
  { id: 7, color: 'black', modelPath: 'assets/black_horse/scene.gltf' },
  { id: 8, color: 'black', modelPath: 'assets/black_horse/scene.gltf' },
  { id: 9, color: 'black', modelPath: 'assets/black_horse/scene.gltf' },
  { id: 10, color: 'brown', modelPath: 'assets/brown_horse/scene.gltf' },
];
const numHorses = horses.length;
const trackWidth = 25;
const horseSpacing = trackWidth / (numHorses + 1);
let horseModels = [];
let animationMixers = [];
let animationActions = [];
let horseSpeeds = []; // Default speed, can be adjusted
let horseTimes = Array(numHorses).fill(0); // Track time for each horse

// Track start and end points
let trackStart = new THREE.Vector3(-200, 0, 0);  // Default start point
let trackEnd = new THREE.Vector3(200, 0, 0);  // Default end point

// Function to generate random speed and add noise
function generateRandomSpeed() {
  return Math.random() * 1 + 12; // Random speed between 8 and 13
}

for (let i = 0; i < numHorses; i++) {
  horseSpeeds.push(generateRandomSpeed());
}

const horseLoader = new GLTFLoader();

horses.forEach((horse, i) => {
  horseLoader.load(horse.modelPath, (gltf) => {
    let horseModel = gltf.scene.clone();
    let xOffset = (i + 1) * horseSpacing - trackWidth / 2;
    horseModel.position.copy(trackStart).add(new THREE.Vector3(0, 0, xOffset)); // Spread out horses along z-axis
    horseModel.rotation.y = Math.PI;
    horseModel.scale.set(0.6, 0.6, 0.6);
    scene.add(horseModel);

    // アニメーションの設定
    if (gltf.animations && gltf.animations.length > 0) {
      let animationMixer = new THREE.AnimationMixer(horseModel);
      animationMixer.timeScale = 3.0;
      let animationAction = animationMixer.clipAction(gltf.animations[0]);
      animationAction.play();
      animationAction.paused = true; // 初期状態でアニメーションを停止

      animationMixers.push(animationMixer);
      animationActions.push(animationAction);
    }

    horseModels.push(horseModel);
  });
});

// 外部トラックモデルの読み込み
const trackLoader = new GLTFLoader();
trackLoader.load('assets/course/scene.gltf', (gltf) => {
  const trackModel = gltf.scene;
  scene.add(trackModel);
});

const controls = new OrbitControls(camera, renderer.domElement);

const clock = new THREE.Clock();

let startRace = false;
let pauseRace = false;

document.addEventListener('keydown', (event) => {
  if (event.key === 's') { // Press 's' to start the race
    startRace = true;
    for (let action of animationActions) {
      action.paused = false; // Unpause the animation
      action.play();
    }
  } else if (event.key === 'p') { // Press 'p' to pause/resume the race
    pauseRace = !pauseRace;
    for (let action of animationActions) {
      action.paused = pauseRace; // Pause or resume the animation
    }
  }
});

// Game Loop
function animate() {
  requestAnimationFrame(animate);
  controls.target.copy(trackStart);
  // Update horse positions based on race logic
  if (startRace && !pauseRace) {
    const delta = clock.getDelta();

    for (let i = 0; i < numHorses; i++) {
      if (animationMixers[i]) {
        animationMixers[i].update(delta);

        if (horseModels[i]) {
          const noise = (Math.random() - 0.5) * 0.4;
          const speedWithNoise = horseSpeeds[i] + noise;

          // Calculate direction vector from start to end
          const direction = new THREE.Vector3().subVectors(trackEnd, trackStart).normalize();
          
          // Move the horse along the direction vector
          horseModels[i].position.add(direction.multiplyScalar(speedWithNoise * delta));

          horseModels[i].rotation.y = Math.PI;

          // Check if the horse has reached the end of the track
          if (horseModels[i].position.x >= trackEnd.x) {
            horseModels[i].position.copy(trackStart); // Reset to start if it reaches the end
            horseTimes[i] = 0; // Reset time
            animationActions[i].paused = true;
          } else {
            horseTimes[i] += delta; // Update time
          }

          // Update camera position to follow the first horse
          if (i === 0) {
            const horseX = horseModels[0].position.x; // Get horse's x-axis position

            // Set camera's x-axis position relative to horse's x-axis position
            const cameraXOffset = 20; // Adjust as needed
            camera.position.x = horseX + cameraXOffset;
                    
            // Set camera lookAt to focus on the horse
            controls.target.copy(horseModels[0].position);
                    
            // Enable OrbitControls
            controls.enabled = true;
          }
        }
      }
    }
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();