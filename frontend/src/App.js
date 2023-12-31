import React from "react";
import Editor from "./pages/Editor";
import 'react-toastify/dist/ReactToastify.css';
import { SceneProvider } from "./context/sceneContext";
import { SocketProvider } from "./context/socketContext";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <SceneProvider>
      <SocketProvider>
        <div className="flex h-full items-center justify-center">
          <Editor />
        </div>
        <ToastContainer
          style={{
            width: 'clamp(300px,40%,480px)',
          }}
        />
      </SocketProvider>
    </SceneProvider>
  );
}

export default App;
