import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

const ARScene = () => {
    const containerRef = useRef();
    const renderer = useRef(new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    const camera = useRef(new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20));
    const scene = useRef(new THREE.Scene());
    const controller = useRef();
    const reticle = useRef();
    const hitTestSource = useRef(null);
    const hitTestSourceRequested = useRef(false);
    const model = useRef(); // Use useRef for the model
    const gltfLoader = new GLTFLoader();

    useEffect(() => {
        init();
        animate();

        // Preload GLTF model
        gltfLoader.load('./3DModel.glb', (gltf) => {
            model.current = gltf.scene;
        }, undefined, (error) => console.error('Error loading GLTF model', error));

        return () => {
            if (containerRef.current) {
                containerRef.current.removeChild(renderer.current.domElement);
            }
        };
    }, []);

    const init = () => {
        containerRef.current = document.createElement('div');
        document.body.appendChild(containerRef.current);

        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        scene.current.add(light);

        renderer.current.setPixelRatio(window.devicePixelRatio);
        renderer.current.setSize(window.innerWidth, window.innerHeight);
        renderer.current.xr.enabled = true;
        containerRef.current.appendChild(renderer.current.domElement);

        document.body.appendChild(ARButton.createButton(renderer.current, { requiredFeatures: ['hit-test'] }));

        controller.current = renderer.current.xr.getController(0);
        controller.current.addEventListener('select', onSelect);
        scene.current.add(controller.current);

        reticle.current = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.2, 24).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial()
        );
        reticle.current.matrixAutoUpdate = false;
        reticle.current.visible = false;
        scene.current.add(reticle.current);

        window.addEventListener('resize', onWindowResize);
    };

    const onWindowResize = () => {
        camera.current.aspect = window.innerWidth / window.innerHeight;
        camera.current.updateProjectionMatrix();
        renderer.current.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
        renderer.current.setAnimationLoop(render);
    };

    const onSelect = () => {
        if (reticle.current.visible && model.current) {
            const clonedModel = model.current.clone(); // Clone the preloaded model

            reticle.current.matrix.decompose(clonedModel.position, clonedModel.quaternion, clonedModel.scale);
            scene.current.add(clonedModel);
        }
    };

    const render = (timestamp, frame) => {
        if (frame) {
            const referenceSpace = renderer.current.xr.getReferenceSpace();
            const session = renderer.current.xr.getSession();

            if (!hitTestSourceRequested.current) {
                session.requestReferenceSpace('viewer').then((refSpace) => {
                    session.requestHitTestSource({ space: refSpace }).then((source) => {
                        hitTestSource.current = source;
                    });
                });

                session.addEventListener('end', () => {
                    hitTestSourceRequested.current = false;
                    hitTestSource.current = null;
                });

                hitTestSourceRequested.current = true;
            }

            if (hitTestSource.current) {
                const hitTestResults = frame.getHitTestResults(hitTestSource.current);

                if (hitTestResults.length) {
                    const hit = hitTestResults[0];
                    reticle.current.visible = true;
                    reticle.current.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
                } else {
                    reticle.current.visible = false;
                }
            }
        }

        renderer.current.render(scene.current, camera.current);
    };

    return null; // You can return JSX here if needed for your React component
};

export default ARScene;
