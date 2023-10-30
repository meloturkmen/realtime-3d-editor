import React, { createContext, useState } from "react";

export const sceneContext = createContext(null);

export const SceneProvider = ({ children }) => {
    const [scene, setScene] = useState(null);
    const [selectedSpotId, setSelectedSpotId] = useState(0);

    return (
        <sceneContext.Provider value={{ scene, setScene, selectedSpotId, setSelectedSpotId }}>
            {children}
        </sceneContext.Provider>
    );
}
