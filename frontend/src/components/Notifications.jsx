import React from 'react';
import { ToastContainer, toast } from 'react-toastify';

const Notifications = () => {
	return (
		<ToastContainer
			position='top-center'
			autoClose={5000}
			style={{
				width: 'clamp(300px,40%,600px)',
			}}
		/>
	);
};

export default Notifications;
