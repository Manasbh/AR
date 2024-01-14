import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

const ARScene = () => {
    const containerRef = useRef();
    const renderer = useRef();
    const camera = useRef();
    const scene = useRef();
    const controller = useRef();
    const reticle = useRef();
    const hitTestSource = useRef(null);
    let hitTestSourceRequested = useRef(false);
    const gltfLoader = new GLTFLoader();

    useEffect(() => {
        init();
        animate();

        return () => {
            if (containerRef.current && renderer.current) {
                containerRef.current.removeChild(renderer.current.domElement);
            }
        };
    }, []);

    function init() {
        containerRef.current = document.createElement('div');
        document.body.appendChild(containerRef.current);

        scene.current = new THREE.Scene();

        camera.current = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
        light.position.set(0.5, 1, 0.25);
        scene.current.add(light);

        renderer.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.current.setPixelRatio(window.devicePixelRatio);
        renderer.current.setSize(window.innerWidth, window.innerHeight);
        renderer.current.xr.enabled = true;
        containerRef.current.appendChild(renderer.current.domElement);

        document.body.appendChild(ARButton.createButton(renderer.current, { requiredFeatures: ['hit-test'] }));

        controller.current = renderer.current.xr.getController(0);
        controller.current.addEventListener('select', onSelect);
        scene.current.add(controller.current);

        reticle.current = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial()
        );
        reticle.current.matrixAutoUpdate = false;
        reticle.current.visible = false;
        scene.current.add(reticle.current);

        window.addEventListener('resize', onWindowResize);
    }

    function onWindowResize() {
        camera.current.aspect = window.innerWidth / window.innerHeight;
        camera.current.updateProjectionMatrix();

        renderer.current.setSize(window.innerWidth, window.innerHeight);
    }

    function onSelect() {
        if (reticle.current.visible) {
            gltfLoader.load(
                './3DModel.glb',
                function (gltf) {
                    const model = gltf.scene;
    
                    const boundingBox = new THREE.Box3().setFromObject(model);
                    const center = new THREE.Vector3();
                    boundingBox.getCenter(center);
    
                    model.position.copy(reticle.current.position); // Set model's position to reticle's position
                    model.position.sub(center); // Adjust for the center of the bounding box
    
                    const size = new THREE.Vector3();
                    boundingBox.getSize(size);
                    const maxDimension = Math.max(size.x, size.y, size.z);
    
                    const scaleFactor = 0.5 / maxDimension;
                    model.scale.multiplyScalar(scaleFactor);
    
                    scene.current.add(model);
                },
                undefined,
                function (error) {
                    console.error('Error loading GLTF model', error);
                }
            );
        }
    }
    
    function render(timestamp, frame) {
        if (frame) {
            const referenceSpace = renderer.current.xr.getReferenceSpace();
    
            if (hitTestSource.current) {
                const hitTestResults = frame.getHitTestResults(hitTestSource.current);
    
                if (hitTestResults.length) {
                    const hit = hitTestResults[0];
    
                    reticle.current.visible = true;
                    reticle.current.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
                    reticle.current.matrix.decompose(reticle.current.position, reticle.current.quaternion, reticle.current.scale);
                } else {
                    reticle.current.visible = false;
                }
            }
        }
    
        renderer.current.render(scene.current, camera.current);
    }
    

    return null; // You might want to return something here if needed
};

export default ARScene;
