import React from "react";
import Editor from "./pages/Editor";

import { SceneProvider } from "./context/sceneContext";
import { SocketProvider } from "./context/socketContext";

function App() {
  return (
    <SceneProvider>
      <SocketProvider>
        <div className="flex h-full items-center justify-center">
          <Editor />
        </div>
      </SocketProvider>
    </SceneProvider>
  );
}

export default App;
