import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const ARScene = () => {
    const containerRef = useRef();
    const renderer = useRef(new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    const camera = useRef(new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20));
    const scene = useRef(new THREE.Scene());
    const controller = useRef();
    const reticle = useRef();
    const gltfLoader = useRef(new GLTFLoader());
    const pmremGenerator = useRef();
    const hitTestSource = useRef(null);
    let hitTestSourceRequested = useRef(false);

    useEffect(() => {
        init();
        animate();

        return () => {
            if (containerRef.current && renderer.current) {
                containerRef.current.removeChild(renderer.current.domElement);
            }
        };
    }, []);

    const init = () => {
        containerRef.current = document.createElement('div');
        document.body.appendChild(containerRef.current);

        // Environment Map
        pmremGenerator.current = new THREE.PMREMGenerator(renderer.current);
        pmremGenerator.current.compileEquirectangularShader();
        new RGBELoader().setDataType(THREE.UnsignedByteType).load('./venice_sunset_1k.hdr', texture => {
            const envMap = pmremGenerator.current.fromEquirectangular(texture).texture;
            pmremGenerator.current.dispose();
            scene.current.environment = envMap;
        });

        // Lighting
        const ambientLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        scene.current.add(ambientLight);

        renderer.current.setPixelRatio(window.devicePixelRatio);
        renderer.current.setSize(window.innerWidth, window.innerHeight);
        renderer.current.xr.enabled = true;
        containerRef.current.appendChild(renderer.current.domElement);

        document.body.appendChild(ARButton.createButton(renderer.current, { requiredFeatures: ['hit-test'] }));

        // Controller
        controller.current = renderer.current.xr.getController(0);
        controller.current.addEventListener('select', onSelect);
        scene.current.add(controller.current);

        // Reticle
        reticle.current = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        reticle.current.matrixAutoUpdate = false;
        reticle.current.visible = false;
        scene.current.add(reticle.current);

        window.addEventListener('resize', onWindowResize, false);
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
        if (reticle.current.visible) {
            gltfLoader.current.load(
                './fbg.glb', // Specify your 3D model path here
                gltf => {
                    const model = gltf.scene;
                    model.position.copy(reticle.current.position);
                    model.scale.set(0.1, 0.1, 0.1); // Adjust scale as needed
                    scene.current.add(model);
                },
                undefined,
                error => console.error('Error loading GLTF model', error)
            );
        }
    };
    
    const render = (timestamp, frame) => {
        if (frame) {
            const referenceSpace = renderer.current.xr.getReferenceSpace();
            const session = renderer.current.xr.getSession();
    
            if (!hitTestSourceRequested.current) {
                session.requestReferenceSpace('viewer').then(refSpace => {
                    session.requestHitTestSource({ space: refSpace }).then(source => {
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
                    reticle.current.matrix.decompose(reticle.current.position, reticle.current.quaternion, reticle.current.scale);
                } else {
                    reticle.current.visible = false;
                }
            }
        }
    
        renderer.current.render(scene.current, camera.current);
    };
    
    return null;
};

export default ARScene;