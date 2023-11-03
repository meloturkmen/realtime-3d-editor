import React, { useCallback, useContext, useMemo } from 'react';
import holonextlogo from '../assets/images/thumbnail.png';
import { sceneContext } from '../context/sceneContext';
import '@google/model-viewer';
import { SPOTS } from '../data/spots';
import { Color3, SceneLoader, Vector3 } from '@babylonjs/core';
import { SocketContext, socket } from '../context/socketContext';
import { SOCKET_EVENTS } from '../constants/socketActions';

const ModelListItem = ({ id, name, url }) => {
	const { scene, selectedSpotId, setSelectedSpotId, setIsModelLoading } =
		useContext(sceneContext);
	const { socket } = useContext(SocketContext);

	const selectedSpot = useMemo(() => {
		return SPOTS.find((spot) => spot.id === selectedSpotId);
	}, [selectedSpotId]);

	const handleModelUpload = useCallback(() => {
		const defaultModel = scene.getMeshById(selectedSpotId);
		setIsModelLoading(true);
		defaultModel && defaultModel.dispose();

		if (!selectedSpot) return;

		//if default model exist remove it before load the new model
		const dMesh = scene.getMeshById(selectedSpotId);
		dMesh && dMesh.dispose();

		SceneLoader.ImportMesh('', '', url, scene, function (newMeshes) {
			const rootMesh = newMeshes[0];

			const { position, rotation } = selectedSpot;

			rootMesh.rotation = rotation;
			rootMesh.position = position;
			rootMesh.scaling = new Vector3(1, 1, 1);
			rootMesh.name = `base-model-${name}`;
			rootMesh.id = selectedSpotId;

			rootMesh.metadata = {
				type: 'model',
				name: name,
				spotID: selectedSpotId,
				sceneID: id,
			};

			// setImportedModel(rootMesh);
			scene.stopAllAnimations();

			// make all child mesh of the root mesh not pickable
			rootMesh.getChildMeshes().forEach((mesh) => {
				mesh.isPickable = true;
			});

			rootMesh.isPickable = true;

			// highlight the selected mesh
			// highlightSelectedMesh(rootMesh);

			const hl = scene.getHighlightLayerByName('hn-default-hl1');

			if (hl) {
				hl.addMesh(rootMesh, Color3.Red());
				rootMesh?.getChildMeshes().forEach((m) => {
					hl.addMesh(m, Color3.Red());
				});
			}




			socket.emit(SOCKET_EVENTS.ADD_MODEL, {
				modelId: id,
				spotId: selectedSpotId,
			});
			setIsModelLoading(false);
		});
	}, [selectedSpotId, scene]);

	return (
		<div
			className='w-full h-[clamp(200px, 20vh, 300px)] mx-0 my-2 border-gray-300 border rounded-md p-2'
			onClick={handleModelUpload}
		>
			<div className='flex justify-between items-center mb-2 w-full text-center h-7'>
				<h3 className='font-medium text-gray-700 text-center w-full'>{name}</h3>
			</div>
			<model-viewer
				src={url}
				poster={holonextlogo}
				alt={`${name} 3d model`}
				camera-controls
				shadow-intensity='1'
				className='room-maker-model-viewer'
			></model-viewer>
		</div>
	);
};

export default ModelListItem;
