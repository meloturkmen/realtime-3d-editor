import React, { createContext, useState } from "react";

export const sceneContext = createContext(null);

export const SceneProvider = ({ children }) => {
    const [scene, setScene] = useState(null);
    const [selectedSpotId, setSelectedSpotId] = useState(null);
    const [isModelLoading, setIsModelLoading] = useState(false);

    return (
        <sceneContext.Provider value={{ scene, setScene, selectedSpotId, setSelectedSpotId, isModelLoading, setIsModelLoading }}>
            {children}
        </sceneContext.Provider>
    );
}
