import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
	Engine,
	FreeCamera,
	Scene,
	WebGPUEngine,
	CubeTexture,
	HemisphericLight,
	Vector3,
	Color3,
	StandardMaterial,
	Camera,
	MeshBuilder,
	SceneLoader,
	PointerEventTypes,
	TransformNode,
	ExecuteCodeAction,
	GlowLayer,
	ActionManager,
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { sceneContext } from '../context/sceneContext';
import { isMobile } from '../utils';
import { SPOTS } from '../data/spots';
import { MODELS } from '../data/models';

const SceneComponent = ({
	antialias = true,
	engineOptions,
	adaptToDeviceRatio,
	sceneOptions,
	onRender,
	onSceneReady,
	...rest
}) => {
	const reactCanvas = useRef(null);
	const { scene, setScene, selectedSpotId, setSelectedSpotId } = useContext(sceneContext);

	const createEngine = async () => {
		const canvas = reactCanvas.current;

		if (navigator.gpu && WebGPUEngine.IsSupported) {
			return new WebGPUEngine(canvas, {
				preserveDrawingBuffer: true,
				stencil: true,
				antialias: true,
			});
		}

		return new Engine(
			canvas,
			true,
			{
				preserveDrawingBuffer: true,
				stencil: true,
				alpha: true,
				antialias: true,
				powerPreference: 'low-power',
			},
			true
		);
	};
	const selectedSpot = useMemo(() => {
		return SPOTS.find((stand) => stand.id === selectedSpotId);
	}, [selectedSpotId]);

	const addCameraMovementControls = (scene) => {
		scene.onPointerObservable.add(function (pointerInfo) {
			if (pointerInfo.type === PointerEventTypes.POINTERPICK) {
				const camera = scene.activeCamera;
				const selectedMesh = pointerInfo.pickInfo.pickedMesh;
				const target = pointerInfo.pickInfo.pickedPoint;

				if (selectedMesh.name.includes('ground')) {
					gsap.to(camera.position, {
						duration: 2,
						x: target.x,
						z: target.z,
						ease: 'power2.easeOut',
					});
				}
			}
		});
	};

	const loadAndInitializeRoomModel = useCallback(async (scene) => {
		try {
			const modelURL =
				'https://holonext.blob.core.windows.net/holonext-public-container/holonext-editor-room-maker/';
			const { meshes } = await SceneLoader.ImportMeshAsync(
				'',
				modelURL,
				'virtual-store-4.glb',
				scene
			);

			if (meshes.length > 0) {
				const roomMesh = meshes[0];
				roomMesh.position = new Vector3(0, 0, 0);
				roomMesh.scaling = new Vector3(-0.15, 0.15, 0.15);

				scene.getEngine().resize();
			} else {
				console.error('No meshes found in the loaded model.');
			}
		} catch (error) {
			console.error(
				'An error occurred while loading and initializing the room model:',
				error
			);
		}
	}, []);

	const loadDefaultModelsToSpots = useCallback(
		async (scene) => {
			for await (const stand of SPOTS) {
				const { position, rotation, defaultModelID } = stand;

				const model = MODELS.find((m) => m.id === defaultModelID);

				// if room models includes the model id don't load the default model to the spot

				if (!model) return;

				const defaultModel = await SceneLoader.ImportMeshAsync('', '', model.url, scene);

				const rootMesh = defaultModel.meshes[0];

				rootMesh.id = stand.id;
				rootMesh.position = position;
				rootMesh.rotation = rotation;
				rootMesh.scaling = new Vector3(1, 1, 1);
				rootMesh.name = `base-model-${model.name}`;

				rootMesh.metadata = {
					type: 'model',
					name: model.name,
					spotID: stand.id,
					sceneID: model.id,
				};

				// Create a TransformNode
				const transformNode = new TransformNode(`transform-${stand.id}`, scene);
				// Make the rootMesh a child of the transformNode
				rootMesh.parent = transformNode;
			}
		},
		[scene]
	);
	const isMeshPickable = (name) => {
		// if name includes any of the invalid names return false
		for (let i = 0; i < SPOTS.length; i++) {
			if (SPOTS[i].name.includes(name)) {
				return true;
			}
		}
		return false;
	};

	const setupHotspots = useCallback(
		(scene) => {
			if (isMobile) return;

			console.log('setupHotspots');
			const meshes = SPOTS.map((stand) => scene.getMeshByName(stand.name));

			meshes.forEach((mesh) => {
				if (!mesh) return;
				// eğer mesh bir transform node ise onun çocuğu olan mesh'i al
				const oldMaterial = mesh?.material;

				if (!isMeshPickable(mesh.name)) return;

				mesh.isPickable = true; // Mesh'in seçilebilir olduğunu belirtin

				// when mouse over the mesh or transform node highlight the mesh and show hotspot circle mesh
				mesh.actionManager = new ActionManager(scene);

				mesh.actionManager.registerAction(
					new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, (ev) => {
						const newMetarial = mesh.material.clone('newMaterial');

						newMetarial.emissiveColor = Color3.Teal();

						mesh.material = newMetarial;

						// make mesh glow
						const gl = new GlowLayer('glow', scene);
						mesh.material.emissiveColor = Color3.Teal();
						gl.intensity = 0.1;

						gl.addIncludedOnlyMesh(mesh);
					})
				);

				mesh.actionManager.registerAction(
					new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, (ev) => {
						if (selectedSpot === mesh.name) return;
						// remove glow layer
						mesh.material = oldMaterial;
						scene.getGlowLayerByName('glow').removeIncludedOnlyMesh(mesh);
					})
				);

				mesh.actionManager.registerAction(
					new ExecuteCodeAction(ActionManager.OnPickTrigger, (ev) => {
						const spot = SPOTS.find((stand) => stand.name === mesh.name);
						const model = scene.getMeshById(spot.id);

						setSelectedSpotId(spot.id);
					})
				);
			});
		},
		[selectedSpot, setSelectedSpotId]
	);

	const createLightsAndEnvironment = async (scene) => {
		const reflectionTexture = CubeTexture.CreateFromPrefilteredData(
			'https://holonext.blob.core.windows.net/holonext-public-container/public_assets/beko-assets/suburb.env',
			scene
		);

		const ambientLight = new HemisphericLight('AmbientLight', new Vector3(0, 1, 0), scene);
		ambientLight.intensity = 0;

		scene.createDefaultSkybox(reflectionTexture, true, 1000, 0.5);
		scene.environmentTexture = reflectionTexture;
	};

	const createAndConfigureCamera = async (scene) => {
		scene.createDefaultCamera(true, true, true);

		const camera = new FreeCamera('camera1', new Vector3(0, 0.2, 1.2), scene);
		// Configure camera properties
		camera.rotation = new Vector3(0.0055, 0.05, 0);
		camera.position = new Vector3(
			-0.0018100147704996918,
			0.2450299645632768,
			-1.275962710044927
		);
		camera.minZ = 0.01;
		camera.fovMode = Camera.FOVMODE_VERTICAL_FIXED;

		camera.attachControl(reactCanvas.current, true);

		camera.keysUp.push(87); // W
		camera.keysDown.push(83); // S
		camera.keysLeft.push(65); // A
		camera.keysRight.push(68); // D

		camera.panningSensibility = 0;
		camera.speed = 0.01;

		scene.activeCamera = camera;
		return camera;
	};

	const createScene = async () => {
		const engine = await createEngine();
		const scene = new Scene(engine, sceneOptions);

		if (scene.isReady()) {
			createAndConfigureCamera(scene);
			createLightsAndEnvironment(scene);
			loadAndInitializeRoomModel(scene);
			addCameraMovementControls(scene);
			await loadDefaultModelsToSpots(scene);
			setupHotspots(scene);

			if (typeof onSceneReady === 'function') onSceneReady(scene);
		} else {
			scene.onReadyObservable.addOnce((scene) => onSceneReady(scene));
		}

		engine.runRenderLoop(() => {
			if (typeof onRender === 'function') onRender(scene);
			scene.render();
		});

		return scene;
	};

	const start = async () => {
		const sc = await createScene();
		console.log('scene loaded successfully');
		setScene(() => sc);
	};

	const resize = useCallback(() => {
		if (scene) {
			scene.getEngine().resize();
		}
	}, [scene]);

	useEffect(() => {
		if (!scene) {
			start();
		}
	}, [antialias, engineOptions, adaptToDeviceRatio, sceneOptions, onRender, onSceneReady]);

	useEffect(() => {
		if (window && scene) {
			window.addEventListener('resize', resize);
		}

		return () => {
			if (window) {
				window.removeEventListener('resize', resize);
			}
		};
	}, [scene, resize]);

	return (
		<canvas
			ref={reactCanvas}
			className='hn-renderCanvas h-full w-full'
			touch-action='none'
			{...rest}
		/>
	);
};

export default SceneComponent;
