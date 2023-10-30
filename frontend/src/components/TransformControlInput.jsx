import { Vector3 } from '@babylonjs/core';
import React, { useContext, useEffect, useState } from 'react';

const TransformControlInput = ({ value: { x, y, z }, onChange, step = 0.1, dataType, model }) => {
	const handleChange = (e) => {
		const { name, value } = e.target;

		const newValues = new Vector3(x, y, z);
        newValues[name] = parseFloat(value);
		onChange(newValues);
	};

	return (
		<div className='flex flex-row w-full justify-between items-center h-7'>
			<h4 className='w-1/5 capitalize text-sm font-medium'>{dataType}</h4>
			<div className='flex w-3/5 gap-1 h-full '>
				<input
					value={x}
					className='flex w-1/3 border border-blue-500 rounded-sm  text-sm  text-center font-medium'
					type='number'
					step={step}
					name='x'
					onChange={handleChange}
				/>
				<input
					value={y}
					className='flex w-1/3 border border-blue-500 rounded-sm text-sm text-center font-medium '
					type='number'
					name='y'
					onChange={handleChange}
					step={step}
				/>
				<input
					value={z}
					className='flex w-1/3 border border-blue-500 rounded-sm  text-sm text-center font-medium'
					type='number'
					name='z'
					onChange={handleChange}
					step={step}
				/>
			</div>
		</div>
	);
};

export default TransformControlInput;
