import { createContext, useEffect } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NODE_ENV === 'production' ? "https://realtime-editor-api.onrender.com" : 'http://localhost:5000';


export const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket']
});

export const SocketContext = createContext();



export const SocketProvider = ({ children }) => {

    useEffect(() => {
        socket.connect();
        return () => {
            socket.disconnect();
        }
    }, []);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
}