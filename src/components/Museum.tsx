import { useRef, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PointerLockControls, OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useControls } from 'leva';
import { InteractiveObject } from './InteractiveObject';
import { TexturedWall } from './TexturedWall';
import { InteractiveObject3D } from './InteractiveObject3D';
import { Controls } from './Controls';

interface MuseumProps {
  isInteracting: boolean;
  onInteractionChange: (isInteracting: boolean) => void;
}

export function Museum({ isInteracting, onInteractionChange }: MuseumProps) {
  const { camera, scene, gl } = useThree();
  const lastPosition = useRef(new THREE.Vector3());
  const lastRotation = useRef(new THREE.Euler());
  const orbitRef = useRef<any>();
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [pointerLockAvailable, setPointerLockAvailable] = useState(true);
  const [pointerLockActive, setPointerLockActive] = useState(false);
  const [pointerLockError, setPointerLockError] = useState<string | null>(null);
  
  const {
    orbitControls,
    wireframe,
    selectionMode,
    lightX,
    lightY,
    lightZ,
    lightIntensity,
    orbitMinDistance,
    orbitMaxDistance,
    orbitDamping,
    collisionElasticity,
    showGrid
  } = useControls({
    orbitControls: false,
    wireframe: false,
    selectionMode: false,
    showGrid: false,
    lightX: { value: 10, min: -20, max: 20, step: 0.1 },
    lightY: { value: 10, min: -20, max: 20, step: 0.1 },
    lightZ: { value: 5, min: -20, max: 20, step: 0.1 },
    lightIntensity: { value: 1.5, min: 0, max: 5, step: 0.1 },
    orbitMinDistance: { value: 5, min: 1, max: 20 },
    orbitMaxDistance: { value: 30, min: 10, max: 50 },
    orbitDamping: { value: 0.8, min: 0, max: 1 },
    collisionElasticity: { value: 0.5, min: 0, max: 1, step: 0.1 }
  });

  useEffect(() => {
    if (lastPosition.current.lengthSq() === 0) {
      camera.position.set(0, 1.7, 8);
      lastPosition.current.copy(camera.position);
      lastRotation.current.copy(camera.rotation);
    }
  }, [camera]);

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.material.wireframe = wireframe;
      }
    });
  }, [scene, wireframe]);

  useEffect(() => {
    if (orbitControls) {
      if (!lastPosition.current.equals(new THREE.Vector3())) {
        lastPosition.current.copy(camera.position);
        lastRotation.current.copy(camera.rotation);
      }
      camera.position.set(0, 10, 20);
    } else {
      if (lastPosition.current.lengthSq() > 0) {
        camera.position.copy(lastPosition.current);
        camera.rotation.copy(lastRotation.current);
      }
    }
  }, [orbitControls, camera]);

  useEffect(() => {
    if (!selectionMode) {
      setSelectedObjectId(null);
    }
  }, [selectionMode]);

  useEffect(() => {
    const checkPointerLock = () => {
      const isAvailable = 'pointerLockElement' in document || 
                         'mozPointerLockElement' in document || 
                         'webkitPointerLockElement' in document;
      setPointerLockAvailable(isAvailable);
      if (!isAvailable) {
        setPointerLockError('Pointer Lock API is not supported in your browser');
      }
    };

    const handlePointerLockChange = () => {
      const isLocked = 
        document.pointerLockElement === gl.domElement ||
        (document as any).mozPointerLockElement === gl.domElement ||
        (document as any).webkitPointerLockElement === gl.domElement;
      
      setPointerLockActive(isLocked);
      if (!isLocked && !isInteracting) {
        setPointerLockError(null);
      }
    };

    const handlePointerLockError = (e: Event) => {
      console.warn('Pointer Lock Error:', e);
      setPointerLockAvailable(false);
      setPointerLockError('Failed to acquire pointer lock. Please try clicking again.');
    };

    checkPointerLock();
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mozpointerlockchange', handlePointerLockChange);
    document.addEventListener('webkitpointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    document.addEventListener('mozpointerlockerror', handlePointerLockError);
    document.addEventListener('webkitpointerlockerror', handlePointerLockError);
    
    const canvas = gl.domElement;
    canvas.tabIndex = 1;
    canvas.style.outline = 'none';

    const requestPointerLock = () => {
      if (orbitControls || !pointerLockAvailable || pointerLockActive || isInteracting) {
        return;
      }

      try {
        if (document.pointerLockElement !== canvas && 
            (document as any).mozPointerLockElement !== canvas && 
            (document as any).webkitPointerLockElement !== canvas) {
          
          canvas.focus();
          
          const requestMethod = canvas.requestPointerLock ||
                              (canvas as any).mozRequestPointerLock ||
                              (canvas as any).webkitRequestPointerLock;

          if (requestMethod) {
            requestMethod.call(canvas);
          } else {
            throw new Error('No pointer lock request method available');
          }
        }
      } catch (error) {
        console.warn('Failed to request pointer lock:', error);
        setPointerLockError('Failed to acquire pointer lock. Please try clicking again.');
        setPointerLockAvailable(false);
      }
    };

    canvas.addEventListener('click', requestPointerLock);

    return () => {
      canvas.removeEventListener('click', requestPointerLock);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mozpointerlockchange', handlePointerLockChange);
      document.removeEventListener('webkitpointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      document.removeEventListener('mozpointerlockerror', handlePointerLockError);
      document.removeEventListener('webkitpointerlockerror', handlePointerLockError);
    };
  }, [gl, orbitControls, pointerLockAvailable, pointerLockActive, isInteracting]);

  const handleObjectSelect = (id: number) => {
    if (!selectionMode) return;
    setSelectedObjectId(id === selectedObjectId ? null : id);
  };

  const handleBackgroundClick = (e: THREE.Event) => {
    if (e.stopPropagation) {
      e.stopPropagation();
      setSelectedObjectId(null);
    }
  };

  const textureUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDuB09POk4Lg3o-lj43gT4a1lJzcJfZvy_Lg&s';

  return (
    <>
      {(orbitControls || !pointerLockAvailable) ? (
        <OrbitControls
          ref={orbitRef}
          minDistance={orbitMinDistance}
          maxDistance={orbitMaxDistance}
          enableDamping={true}
          dampingFactor={orbitDamping}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={0}
          target={new THREE.Vector3(0, 0, 0)}
          enabled={!selectedObjectId && !isInteracting}
        />
      ) : (
        <PointerLockControls makeDefault enabled={!isInteracting} />
      )}

      <Controls isInteracting={isInteracting} />
      
      {/* Lights */}
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[lightX, lightY, lightZ]}
        intensity={lightIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Floor with click handler */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
        onClick={handleBackgroundClick}
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#e879f9" />
      </mesh>

      {/* Grids */}
      {showGrid && (
        <>
          <Grid
            position={[0, 0.02, 0]}
            args={[30, 30]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#ffffff"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#ffffff"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={false}
          />
          
          <Grid
            position={[0, 0.02, 15]}
            args={[30, 30]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#000000"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#000000"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={false}
          />
          <Grid
            position={[0, 0.02, -15]}
            args={[30, 30]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#000000"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#000000"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={false}
          />
          <Grid
            position={[15, 0.02, 0]}
            args={[30, 30]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#000000"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#000000"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={false}
          />
          <Grid
            position={[-15, 0.02, 0]}
            args={[30, 30]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#000000"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#000000"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={false}
          />
        </>
      )}

      {/* Interactive test object */}
      <InteractiveObject3D
        position={[-3, 2, 5]}
        title="Test Object"
        description="A rotating cube with an applied texture, demonstrating material and lighting effects in Three.js. This object showcases dynamic lighting, texture mapping, and real-time rotation animation."
        onInteractionChange={onInteractionChange}
      >
        <mesh castShadow>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial
            map={new THREE.TextureLoader().load(textureUrl)}
            transparent={true}
            side={THREE.DoubleSide}
            roughness={0.5}
            metalness={0.5}
          />
        </mesh>
      </InteractiveObject3D>

      {/* Back wall with texture */}
      <TexturedWall
        position={[0, 2.5, -10]}
        size={[10, 5, 0.2]}
        color="#fde047"
        isSelected={selectedObjectId === 6}
        onSelect={() => handleObjectSelect(6)}
        name="Back Wall"
        textureUrl={textureUrl}
      />

      {/* Left wall sections */}
      <InteractiveObject
        position={[-10, 2.5, -5]}
        size={[0.2, 5, 10]}
        color="#fde047"
        isSelected={selectedObjectId === 7}
        onSelect={() => handleObjectSelect(7)}
        name="Left Wall Front"
      />

      <InteractiveObject
        position={[-10, 2.5, 5]}
        size={[0.2, 5, 10]}
        color="#fde047"
        isSelected={selectedObjectId === 8}
        onSelect={() => handleObjectSelect(8)}
        name="Left Wall Back"
      />

      {/* Right wall sections */}
      <InteractiveObject
        position={[10, 2.5, -5]}
        size={[0.2, 5, 10]}
        color="#fde047"
        isSelected={selectedObjectId === 9}
        onSelect={() => handleObjectSelect(9)}
        name="Right Wall Front"
      />

      <InteractiveObject
        position={[10, 2.5, 5]}
        size={[0.2, 5, 10]}
        color="#fde047"
        isSelected={selectedObjectId === 10}
        onSelect={() => handleObjectSelect(10)}
        name="Right Wall Back"
      />

      {/* Interior walls */}
      {/* Center wall with opening */}
      <group position={[0, 2.5, 0]}>
        <InteractiveObject
          position={[-4, 0, 0]}
          size={[4, 5, 0.2]}
          color="#fde047"
          isSelected={selectedObjectId === 11}
          onSelect={() => handleObjectSelect(11)}
          name="Center Wall Left"
        />
        <InteractiveObject
          position={[4, 0, 0]}
          size={[4, 5, 0.2]}
          color="#fde047"
          isSelected={selectedObjectId === 12}
          onSelect={() => handleObjectSelect(12)}
          name="Center Wall Right"
        />
      </group>

      {/* Left interior wall */}
      <InteractiveObject
        position={[-5, 2.5, -5]}
        size={[0.2, 5, 5]}
        color="#fde047"
        isSelected={selectedObjectId === 13}
        onSelect={() => handleObjectSelect(13)}
        name="Interior Wall"
      />

      {/* Display stands */}
      {/* Front room stands */}
      <InteractiveObject
        position={[-3, 0.5, 5]}
        size={[2, 1, 2]}
        color="#3b82f6"
        isSelected={selectedObjectId === 1}
        onSelect={() => handleObjectSelect(1)}
        name="Front Left Stand"
      />

      <InteractiveObject
        position={[3, 0.5, 5]}
        size={[2, 1, 2]}
        color="#3b82f6"
        isSelected={selectedObjectId === 2}
        onSelect={() => handleObjectSelect(2)}
        name="Front Right Stand"
      />

      {/* Back room stands */}
      <InteractiveObject
        position={[-3, 0.5, -5]}
        size={[2, 1, 2]}
        color="#3b82f6"
        isSelected={selectedObjectId === 3}
        onSelect={() => handleObjectSelect(3)}
        name="Back Left Stand"
      />

      <InteractiveObject
        position={[3, 0.5, -5]}
        size={[2, 1, 2]}
        color="#3b82f6"
        isSelected={selectedObjectId === 4}
        onSelect={() => handleObjectSelect(4)}
        name="Back Right Stand"
      />

      {/* Side room stand */}
      <InteractiveObject
        position={[7, 0.5, -5]}
        size={[2, 1, 4]}
        color="#3b82f6"
        isSelected={selectedObjectId === 5}
        onSelect={() => handleObjectSelect(5)}
        name="Side Stand"
      />

      {/* Error message overlay */}
      {pointerLockError && (
        <group position={[0, 2, -5]}>
          <mesh>
            <planeGeometry args={[4, 1]} />
            <meshBasicMaterial color="red" transparent opacity={0.8} />
          </mesh>
        </group>
      )}
    </>
  );
}

export default Museum;