import { Canvas } from '@react-three/fiber';
import { Museum } from './components/Museum';
import { Controls } from './components/Controls';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

function App() {
  const [showInstructions, setShowInstructions] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [showFadeFromWhite, setShowFadeFromWhite] = useState(false);
  const [activeKeys, setActiveKeys] = useState(new Set<string>());
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isInteracting) {
        setActiveKeys(prev => new Set(prev).add(e.code));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setActiveKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(e.code);
        return newSet;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isInteracting]);

  useEffect(() => {
    if (hasStarted) {
      const timer = setTimeout(() => {
        setShowInstructions(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [hasStarted]);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold text-white mb-8 animate-fade-in">
          Virtual Museum
        </h1>
        <div className="space-y-4">
          <button
            onClick={() => {
              setShowTransition(true);
              setTimeout(() => {
                setIsLoading(false);
                setHasStarted(true);
                setShowFadeFromWhite(true);
              }, 3000);
            }}
            className="px-8 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors duration-200 text-xl"
          >
            Enter Museum
          </button>
        </div>
        {showTransition && (
          <div className="fixed inset-0 bg-white animate-fade-to-white z-50" />
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 1000 }}
        style={{ background: '#ffffff' }}
      >
        <Museum isInteracting={isInteracting} onInteractionChange={setIsInteracting} />
        <Controls isInteracting={isInteracting} />
      </Canvas>
      
      {/* Aim pointer */}
      {!isInteracting && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-2 h-2 bg-white bg-opacity-30 border-2 border-black border-opacity-30 rounded-full"></div>
        </div>
      )}
      
      {/* Movement Controls HUD */}
      {!isInteracting && (
        <div className="fixed bottom-4 left-4 grid grid-cols-3 gap-0.5 scale-75 select-none pointer-events-none opacity-40">
          <div className="col-start-2">
            <div className={`p-1.5 rounded-lg ${activeKeys.has('KeyW') ? 'bg-black text-white' : 'bg-black/20 text-black'} transition-colors duration-100`}>
              <ArrowUp size={20} />
            </div>
          </div>
          <div className="col-start-1 col-end-4 grid grid-cols-3 gap-0.5">
            <div className={`p-1.5 rounded-lg ${activeKeys.has('KeyA') ? 'bg-black text-white' : 'bg-black/20 text-black'} transition-colors duration-100`}>
              <ArrowLeft size={20} />
            </div>
            <div className={`p-1.5 rounded-lg ${activeKeys.has('KeyS') ? 'bg-black text-white' : 'bg-black/20 text-black'} transition-colors duration-100`}>
              <ArrowDown size={20} />
            </div>
            <div className={`p-1.5 rounded-lg ${activeKeys.has('KeyD') ? 'bg-black text-white' : 'bg-black/20 text-black'} transition-colors duration-100`}>
              <ArrowRight size={20} />
            </div>
          </div>
        </div>
      )}

      {/* ESC key info */}
      {!isInteracting && (
        <div className="fixed bottom-4 right-4 text-sm text-black/40 pointer-events-none">
          Press <kbd className="px-2 py-0.5 bg-black/10 rounded">ESC</kbd> for mouse cursor
        </div>
      )}
      
      {/* White fade transition */}
      {showFadeFromWhite && (
        <div 
          className="fixed inset-0 bg-white animate-fade-from-white z-50"
          onAnimationEnd={() => setShowFadeFromWhite(false)}
        />
      )}
      
      {/* Instructions overlay with fade effect */}
      {showInstructions && !isInteracting && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-75 p-6 rounded-lg text-white text-center transition-opacity duration-1000 animate-fade-in">
          <h2 className="text-2xl font-bold mb-4">Controls</h2>
          <div className="space-y-2 text-lg">
            <p className="flex items-center justify-between gap-4">
              <span className="font-bold">Move:</span>
              <span className="font-mono bg-gray-800 px-2 py-1 rounded">WASD</span>
            </p>
            <p className="flex items-center justify-between gap-4">
              <span className="font-bold">Look:</span>
              <span className="font-mono bg-gray-800 px-2 py-1 rounded">Mouse</span>
            </p>
            <p className="flex items-center justify-between gap-4">
              <span className="font-bold">Exit control:</span>
              <span className="font-mono bg-gray-800 px-2 py-1 rounded">ESC</span>
            </p>
          </div>
          <p className="mt-6 text-sm text-gray-300">
            This window will close automatically in a few seconds
          </p>
        </div>
      )}
    </div>
  );
}

export default App;