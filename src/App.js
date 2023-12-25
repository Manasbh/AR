import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

const ARScene = () => {
    const containerRef = useRef();
    const camera = useRef();
    const scene = useRef();
    const renderer = useRef();
    const reticle = useRef();
    const hitTestSource = useRef(null);
    let hitTestSourceRequested = false;

    const boxDimensions = { width: 1, height: 1, depth: 1 }; // Predefined box dimensions

    useEffect(() => {
        const container = containerRef.current;

        scene.current = new THREE.Scene();

        camera.current = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
        light.position.set(0.5, 1, 0.25);
        scene.current.add(light);

        renderer.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.current.setPixelRatio(window.devicePixelRatio);
        renderer.current.setSize(window.innerWidth, window.innerHeight);
        renderer.current.xr.enabled = true;
        container.appendChild(renderer.current.domElement);

        document.body.appendChild(ARButton.createButton(renderer.current, { requiredFeatures: ['hit-test'] }));

        const gltfLoader = new GLTFLoader();

        const onSelect = () => {
            if (reticle.current.visible) {
                gltfLoader.load(
                    './3DModel.glb',
                    function (gltf) {
                        const model = gltf.scene;

                        const offset = new THREE.Vector3(0, 0, -0.3); // Adjust the offset as needed
                        offset.applyQuaternion(camera.current.quaternion);
                        offset.add(reticle.current.position);

                        model.position.copy(offset);

                        // Calculate scaling based on predefined box dimensions
                        const scaleFactorX = boxDimensions.width / model.scale.x;
                        const scaleFactorY = boxDimensions.height / model.scale.y;
                        const scaleFactorZ = boxDimensions.depth / model.scale.z;

                        const scaleFactor = Math.min(scaleFactorX, scaleFactorY, scaleFactorZ);
                        model.scale.multiplyScalar(scaleFactor);

                        scene.current.add(model);
                    },
                    undefined,
                    function (error) {
                        console.error('Error loading GLB model', error);
                    }
                );
            }
        };

        const controller = renderer.current.xr.getController(0);
        controller.addEventListener('select', onSelect);
        scene.current.add(controller);

        reticle.current = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial()
        );
        reticle.current.matrixAutoUpdate = false;
        reticle.current.visible = false;
        scene.current.add(reticle.current);

        window.addEventListener('resize', onWindowResize);

        return () => {
            // Cleanup logic (if needed)
        };
    }, []);

    const onWindowResize = () => {
        camera.current.aspect = window.innerWidth / window.innerHeight;
        camera.current.updateProjectionMatrix();
        renderer.current.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
        renderer.current.setAnimationLoop(render);
    };

    const render = (timestamp, frame) => {
        if (frame) {
            const referenceSpace = renderer.current.xr.getReferenceSpace();
            const session = renderer.current.xr.getSession();

            if (hitTestSourceRequested === false) {
                session.requestReferenceSpace('viewer').then(function (referenceSpace) {
                    session.requestHitTestSource({ space: referenceSpace }).then(function (source) {
                        hitTestSource.current = source;
                    });
                });

                session.addEventListener('end', function () {
                    hitTestSourceRequested = false;
                    hitTestSource.current = null;
                });

                hitTestSourceRequested = true;
            }

            if (hitTestSource.current) {
                const hitTestResults = frame.getHitTestResults(hitTestSource.current);

                if (hitTestResults.length) {
                    const hit = hitTestResults[0];

                    reticle.current.visible = true;
                    reticle.current.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);

                    const raycaster = new THREE.Raycaster();
                    const direction = new THREE.Vector3(0, 0, -1);
                    direction.applyQuaternion(camera.current.quaternion);

                    raycaster.set(camera.current.position, direction);

                    const intersects = raycaster.intersectObject(reticle.current);

                    if (intersects.length > 0) {
                        const intersection = intersects[0];
                        const offset = new THREE.Vector3(0, 0, -0.3); // Adjust the offset as needed
                        offset.applyQuaternion(reticle.current.quaternion);
                        offset.add(intersection.point);

                        reticle.current.position.copy(offset);
                    }
                } else {
                    reticle.current.visible = false;
                }
            }
        }

        renderer.current.render(scene.current, camera.current);
    };

    useEffect(() => {
        animate();
    }, []);

    return <div ref={containerRef}></div>;
};

export default ARScene;
