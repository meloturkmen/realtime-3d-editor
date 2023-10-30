import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useReducer } from 'react';
import { GizmoManager, Vector3 } from '@babylonjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faArrowPointer,
	faRotate,
	faUpDownLeftRight,
	faUpRightAndDownLeftFromCenter,
} from '@fortawesome/free-solid-svg-icons';
import { SOCKET_EVENTS } from '../constants/socketActions';
import { sceneContext } from '../context/sceneContext';
import { SocketContext } from '../context/socketContext';
import { SPOTS } from '../data/spots';
import TransformControlInput from './TransformControlInput';

const INITAL_STATE = {
	rotation: new Vector3(0, 0, 0),
	position: new Vector3(0, 0, 0),
	scaling: new Vector3(0, 0, 0),
	model: null,
};

const ACTION_TYPES = {
	ROTATION_CHANGE: 'rotation-change',
	POSITION_CHANGE: 'position-change',
	SCALING_CHANGE: 'scaling-change',
	ADD_MODEL: 'add-model',
	REMOVE_MODEL: 'remove-model',
	SET_STATE: 'set-state',
};

export const transformReducer = (state = INITAL_STATE, action) => {
	switch (action.type) {
		case ACTION_TYPES.SET_STATE:
			return { ...state, ...action.payload };
		case ACTION_TYPES.POSITION_CHANGE:
			return { ...state, position: action.payload };
		case ACTION_TYPES.SCALING_CHANGE:
			return { ...state, scaling: action.payload };
		case ACTION_TYPES.ROTATION_CHANGE:
			return { ...state, rotation: action.payload };
		default:
			return state;
	}
};

const TransformationControls = () => {
	const { scene, selectedSpotId } = useContext(sceneContext);
	const { socket } = useContext(SocketContext);

	const selectedSpot = useMemo(() => {
		return SPOTS.find((spot) => spot.id === selectedSpotId);
	}, [selectedSpotId]);

	const model = useMemo(() => {
		return scene?.getMeshById(selectedSpotId);
	}, [scene, selectedSpotId]);

	const [gizmoManager, setGizmoManager] = useState(null);

	const [state, dispatch] = useReducer(transformReducer, INITAL_STATE);

	const handlePositionChange = (position) => {
		dispatch({ type: ACTION_TYPES.POSITION_CHANGE, payload: position });
		socket.emit(SOCKET_EVENTS.POSITION_CHANGE, { position, mesh: model.id });
		model.position = position;
	};

	const handleRotationChange = (rotation) => {
		dispatch({ type: ACTION_TYPES.ROTATION_CHANGE, payload: rotation });
		socket.emit(SOCKET_EVENTS.ROTATION_CHANGE, { rotation, mesh: model.id });
		model.rotation = rotation;
	};

	const handleScalingChange = (scaling) => {
		dispatch({ type: ACTION_TYPES.SCALING_CHANGE, payload: scaling });
		socket.emit(SOCKET_EVENTS.SCALING_CHANGE, { scale: scaling, mesh: model.id });
		model.scaling = scaling;
	};

	const handleGizmoAttach = useCallback(
		(gizmoType) => {
			if (!model || !gizmoManager) return;

			const enableGizmo = (position, rotation, scaling, boundingBox) => {
				gizmoManager.positionGizmoEnabled = position;
				gizmoManager.rotationGizmoEnabled = rotation;
				gizmoManager.scaleGizmoEnabled = scaling;
				gizmoManager.boundingBoxGizmoEnabled = boundingBox;
			};

			const onDragEndCallback = (property, handleChange) => (event) => {
				console.log('event', event);

				console.log('gizmoManager', gizmoManager);
				const newValue = new Vector3(
					model[property].x,
					model[property].y,
					model[property].z
				);

				handleChange(newValue);
			};

			gizmoManager.attachableMeshes.push(model);
			gizmoManager.ignoreChildren = true;
			gizmoManager.attachToMesh(model);

			gizmoManager.updateGizmoRotationToMatchAttachedMesh = false;
			gizmoManager.updateGizmoPositionToMatchAttachedMesh = true;

			switch (gizmoType) {
				case 'position':
					enableGizmo(true, false, false, false);
					gizmoManager.gizmos.positionGizmo.onDragEndObservable.add(
						onDragEndCallback('position', handlePositionChange)
					);
					break;
				case 'rotation':
					enableGizmo(false, true, false, false);
					gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
					gizmoManager.gizmos.rotationGizmo.onDragEndObservable.add(
						onDragEndCallback('rotation', handleRotationChange)
					);
					break;
				case 'scaling':
					enableGizmo(false, false, true, false);
					gizmoManager.gizmos.scaleGizmo.onDragEndObservable.add(
						onDragEndCallback('scaling', handleScalingChange)
					);
					break;
				case 'bounding-box':
					enableGizmo(false, false, false, true);
					const scaleBoxSize = 0.01;
					gizmoManager.gizmos.boundingBoxGizmo.scaleBoxSize = scaleBoxSize;
					break;
				default:
					enableGizmo(false, false, false, false);
					gizmoManager.attachToMesh(null);
					break;
			}

			console.log('gizmoManager', gizmoManager);
			console.log(state);
		},
		[model, gizmoManager]
	);

	useEffect(() => {
		if (!scene || !model) return;

		// set state to model position, rotation, scaling
		dispatch({
			type: ACTION_TYPES.SET_STATE,
			payload: {
				position: new Vector3(model.position.x, model.position.y, model.position.z),
				rotation: new Vector3(model.rotation.x, model.rotation.y, model.rotation.z),
				scaling: new Vector3(model.scaling.x, model.scaling.y, model.scaling.z),
			},
		});
	}, [model, scene]);

	useEffect(() => {
		if (!scene) return;
		console.log('scene', scene);
		const gM = new GizmoManager(scene);
		gM.attachableMeshes = [];

		setGizmoManager(() => gM);

		return () => gM.dispose();
	}, [scene]);

	if (!selectedSpotId) return null;

	return (
		<div className='flex flex-col  absolute top-4 left-4  h-[calc(100%-2rem)] rounded-lg  gap-8 px-5 w-[clamp(230px,20%,320px)] bg-gray-50 p-5'>
			<h1 className='text-xl font-bold text-center'>Transformations</h1>

			<div className='border-b border-b-zinc-300'>
				<div className='w-full flex items-center justify-start gap-8  py-4'>
					<p className=' text-sm font-medium w-24'>Spot ID </p>
					<span className=' text-sm font-medium text-[#343cec]'>{selectedSpotId}</span>
				</div>
				<div className='w-full flex items-center justify-start gap-8 py-4'>
					<p className=' text-sm font-medium w-24'>Spot Name </p>
					<span className=' text-sm font-medium text-[#343cec]'>
						{selectedSpot.standName}
					</span>
				</div>
				{model && (
					<div className='w-full flex items-center justify-start gap-8  py-4'>
						<p className=' text-sm font-medium w-24'>Model Name </p>
						<span className=' text-sm font-medium text-[#343cec]'>
							{model?.name.replace('base-model-', '') || 'Model'}
						</span>
					</div>
				)}
			</div>
			{model && (
				<>
					<div className='flex flex-row justify-between'>
						<div
							className='flex w-8 h-8 items-center justify-center bg-blue-600 text-white cursor-pointer rounded-md'
							onClick={() => handleGizmoAttach()}
						>
							<FontAwesomeIcon icon={faArrowPointer} />
						</div>
						<div
							className='flex w-8 h-8 items-center justify-center bg-blue-600 text-white cursor-pointer rounded-md'
							onClick={() => handleGizmoAttach('position')}
						>
							<FontAwesomeIcon icon={faUpDownLeftRight} />
						</div>
						<div
							className='flex w-8 h-8 items-center justify-center bg-blue-600 text-white cursor-pointer rounded-md'
							onClick={() => handleGizmoAttach('scaling')}
						>
							<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} />
						</div>
						<div
							className='flex w-8 h-8 items-center justify-center bg-blue-600 text-white cursor-pointer rounded-md'
							onClick={() => handleGizmoAttach('rotation')}
						>
							<FontAwesomeIcon icon={faRotate} />
						</div>
					</div>
					<div className='flex flex-col w-full gap-4'>
						<TransformControlInput
							value={state.position}
							onChange={handlePositionChange}
							dataType={'position'}
						/>
						<TransformControlInput
							value={state.rotation}
							onChange={handleRotationChange}
							dataType={'rotation'}
						/>
						<TransformControlInput
							value={state.scaling}
							onChange={handleScalingChange}
							dataType={'scaling'}
						/>
					</div>
				</>
			)}
			<button className='flex w-full bg-blue-500 mt-auto text-white py-2 rounded-md text-center font-medium items-center justify-center hover:bg-blue-700'>
				Remove Model
			</button>
		</div>
	);
};

export default TransformationControls;
