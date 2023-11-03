import React, { useCallback, useContext, useEffect, useState } from 'react';
import Scene from '../components/Scene';
import ModelList from '../components/ModelList';
import { sceneContext } from '../context/sceneContext';
import TransformationControls from '../components/TransformControls';
import { SOCKET_EVENTS } from '../constants/socketActions';
import { v4 as uuid } from 'uuid';
import { MeshBuilder, SceneLoader, StandardMaterial, Vector3 } from '@babylonjs/core';
import { SocketContext } from '../context/socketContext';
import { MODELS } from '../data/models';
import { SPOTS } from '../data/spots';
import Loading from '../components/Loading';
import { toast } from 'react-toastify';

const user = {
	id: uuid(),
	username: `user-${uuid().slice(0, 5)}`,
};

const Editor = () => {
	const { scene, selectedSpotId ,setSelectedSpotId} = useContext(sceneContext);
	const { socket } = useContext(SocketContext);

	const [isLoading, setIsLoading] = useState(true);

	function joinSession({ sessionId }) {
		socket.emit(SOCKET_EVENTS.JOIN_SESSION, { sessionId, user });
	}

	function onAddModel({ modelId, spotId }) {
		console.log('adding remote model');

		const defaultModel = scene.getMeshById(spotId);

		defaultModel && defaultModel.dispose();
		const model = MODELS.find((m) => m.id === modelId);

		SceneLoader.ImportMesh('', '', model.url, scene, function (newMeshes) {
			const rootMesh = newMeshes[0];

			const { position, rotation } = SPOTS.find((spot) => spot.id === spotId);

			rootMesh.rotation = rotation;
			rootMesh.position = position;
			rootMesh.name = `base-model-${model.name}`;
			rootMesh.id = spotId;

			rootMesh.metadata = {
				type: 'model',
				name: model.name,
				spotID: spotId,
				sceneID: model.id,
			};

			// setImportedModel(rootMesh);
			scene.stopAllAnimations();

			// make all child mesh of the root mesh not pickable
			rootMesh.getChildMeshes().forEach((mesh) => {
				mesh.isPickable = true;
			});

			rootMesh.isPickable = true;
			// remove spot from the scene
		});
	}

	function onRemoveModel({ spotId }) {
		console.log('removing remote model', spotId);
		const box = scene?.getMeshById(spotId);
		box?.dispose();
	}

	function onPositionChange({ position, mesh }) {
		console.log(scene);
		console.log('position change', position, mesh);

		const box = scene?.getMeshById(mesh);
		if (!box) return;
		console.log('box', box);

		box.position = new Vector3(position._x, position._y, position._z);
		console.log(position, mesh);
	}

	function onRotationChange({ rotation, mesh }) {
		console.log('rotation change', rotation, mesh);

		const box = scene?.getMeshById(mesh);
		if (!box) return;
		box.rotation = new Vector3(rotation._x, rotation._y, rotation._z);
		console.log(rotation, mesh);
	}

	function onScaleChange({ scale, mesh }) {
		const m = scene?.getMeshById(mesh);
		if (!m) return;
		m.scaling = new Vector3(scale._x, scale._y, scale._z);
		console.log(scale, mesh);
	}

	useEffect(() => {
		if (!scene || !socket) return;

		const url = new URL(window.location.href);
		const sessionId = url.searchParams.get('sessionId') || uuid().slice(0, 8);

		url.searchParams.set('sessionId', sessionId);
		window.history.pushState({}, null, url);

		joinSession({ sessionId });
	}, [scene, socket]);

	function onMessageReceive({ message }) {
		console.log('message received');
		console.log({ message });
		toast.info(`${message.text}`, {
			position: 'top-center',
			autoClose: 2000,
			hideProgressBar: false,
			closeOnClick: true,
			pauseOnHover: false,
			draggable: true,
			progress: undefined,
			theme: 'light',
		});
	}

	function onHistoryTake({ history }) {
		console.log('history taken');
		console.log({ history });

		if (typeof history === 'object' && history.length > 0) {
			history.forEach(({ operation: { event, data } }) => {
				switch (event) {
					case SOCKET_EVENTS.ADD_MODEL:
						onAddModel(data);
						break;
					case SOCKET_EVENTS.REMOVE_MODEL:
						onRemoveModel(data);
						break;
					case SOCKET_EVENTS.POSITION_CHANGE:
						onPositionChange(data);
						break;
					case SOCKET_EVENTS.ROTATION_CHANGE:
						onRotationChange(data);
						break;
					case SOCKET_EVENTS.SCALING_CHANGE:
						onScaleChange(data);
						break;
					default:
						break;
				}
			});
		}

		setIsLoading(false);
	}

	useEffect(() => {
		if (!socket || !scene) return;

		const socketEventListeners = [
			{ event: SOCKET_EVENTS.ADD_MODEL, handler: onAddModel },
			{ event: SOCKET_EVENTS.REMOVE_MODEL, handler: onRemoveModel },
			{ event: SOCKET_EVENTS.POSITION_CHANGE, handler: onPositionChange },
			{ event: SOCKET_EVENTS.ROTATION_CHANGE, handler: onRotationChange },
			{ event: SOCKET_EVENTS.SCALING_CHANGE, handler: onScaleChange },
			{ event: SOCKET_EVENTS.MESSAGE, handler: onMessageReceive },
			{ event: SOCKET_EVENTS.SESSION_HISTORY, handler: onHistoryTake },
		];

		socketEventListeners.forEach(({ event, handler }) => {
			socket.on(event, handler);
		});

		return () => {
			socketEventListeners.forEach(({ event, handler }) => {
				socket.off(event, handler);
			});

			socket.disconnect();
		};
	}, [scene, socket]);

	return (
		<div className='flex h-full w-full relativeƒ'>
			{isLoading && <Loading />}
			<Scene />
			{selectedSpotId && <ModelList />}
			<TransformationControls />
			<button className='absolute top-2 right-4 bg-blue-600 px-3 py-2 rounded-md text-white w-[clamp(230px,20%,300px)]' onClick={()=>setSelectedSpotId(15)}>
				Add New Model
			</button>
			<div className='absolute top-2 left-4 border  border-blue-600 px-3 py-2 rounded-md text-white w-[clamp(230px,20%,320px)]'>
				Username : {user.username} <br />
			</div>
		</div>
	);
};

export default Editor;
