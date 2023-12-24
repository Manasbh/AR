import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

const ARScene = () => {
  const canvasRef = useRef(null);
  const objectPlacedRef = useRef(false); // Reference to track if the object has been placed

  useEffect(() => {
    let scene, camera, renderer, model, reticle, placedObject;

    const setupScene = async () => {
      // Set up the scene
      scene = new THREE.Scene();

      // Set up the camera
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 0;
      camera.position.x = -3;
      camera.position.y = 3.5;
      camera.lookAt(-20, 5, -1);

      // Set up the renderer with antialiasing enabled
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(ARButton.createButton(renderer)); // Add AR button

      // Load the GLTF model
      const loader = new GLTFLoader();
      try {
        const gltf = await loader.loadAsync('/envi1.glb');
        model = gltf.scene;
        scene.add(model);
      } catch (error) {
        console.error('Error loading GLTF model:', error);
      }

      // Set up the reticle for object placement indication
      const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32);
      const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true });
      reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
      reticle.rotation.x = - Math.PI / 2; // Correct orientation
      reticle.visible = false;
      scene.add(reticle);

      // Handle AR session
      renderer.xr.enabled = true;
      renderer.xr.addEventListener('sessionstart', onSessionStart);
      renderer.xr.addEventListener('sessionend', onSessionEnd);
      renderer.xr.addEventListener('select', onSelect);

      // Handle session start
      function onSessionStart(event) {
        // Do something when the AR session starts
      }

      // Handle session end
      function onSessionEnd(event) {
        // Do something when the AR session ends
      }

      // Handle object placement on tap
      function onSelect(event) {
        if (reticle.visible && !objectPlacedRef.current) {
          placedObject = model.clone(); // Clone the model to place it
          placedObject.position.copy(reticle.position); // Set object position to the reticle's position
          scene.add(placedObject); // Add the object to the scene
          objectPlacedRef.current = true; // Update the reference to indicate object placement
        }
      }

      // Set up animation loop
      const animate = () => {
        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera);
        });
      };

      animate();
    };

    setupScene();

    const handleResize = () => {
      if (renderer.xr.isPresenting) {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh', display: 'block' }} />;
};

export default ARScene;
