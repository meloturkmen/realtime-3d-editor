import React from 'react';
import { MODELS } from '../data/models';
import ModelListItem from './ModelListItem';

const ModelList = () => {
	return (
		<div className='flex flex-col absolute top-16 right-4 shadow-sm bg-white h-[calc(100%-72px)] w-[clamp(230px,20%,300px)] rounded-lg py-4 px-0 overflow-hidden'>
			{!MODELS && <div>There are no MODELS to display.</div>}
			<div className='flex flex-col gap-4 px-4 overflow-scroll overflow-x-hidden'>
				{MODELS &&
					MODELS.length > 0 &&
					MODELS.map((m, idx) => {
						return <ModelListItem key={idx} {...m} />;
					})}
			</div>
		</div>
	);
};

export default ModelList;
