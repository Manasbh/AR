// Import necessary modules
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add AR button
document.body.appendChild(ARButton.createButton(renderer));

// Create a sphere geometry
const geometry = new THREE.SphereGeometry(0.1, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Variable to track whether the object is stagnant
let isStagnant = false;

// Function to handle tap event
const handleTap = (event) => {
  if (!isStagnant) {
    isStagnant = true;

    // Get the tapped position in Three.js world coordinates
    const tap = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0, transparent: true })
    );
    tap.rotation.x = -Math.PI / 2;
    tap.position.copy(sphere.position);
    scene.add(tap);

    const tapPoint = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(event.offsetX / window.innerWidth * 2 - 1, -(event.offsetY / window.innerHeight) * 2 + 1, camera);
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1)), tapPoint);

    // Set the sphere's position to the tapped position
    sphere.position.copy(tapPoint);

    scene.remove(tap);
  }
};

// Add event listener for tap event
window.addEventListener('click', handleTap);

// Render loop
function animate() {
  requestAnimationFrame(animate);

  if (!isStagnant) {
    // Move the sphere with the camera
    sphere.position.copy(camera.position);
    sphere.position.z -= 0.5; // Adjust the distance from the camera
  }

  renderer.render(scene, camera);
}

animate();