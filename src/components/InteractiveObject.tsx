import { useRef, useState, useEffect } from 'react';
import { TransformControls, Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface InteractiveObjectProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  name: string;
}

export function InteractiveObject({ position, size, color, isSelected, onSelect, name }: InteractiveObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [currentPosition, setCurrentPosition] = useState(position);
  const { scene } = useThree();
  
  const handleClick = (e: THREE.Event) => {
    e.stopPropagation();
    onSelect();
  };

  useEffect(() => {
    if (meshRef.current) {
      setCurrentPosition([
        meshRef.current.position.x,
        meshRef.current.position.y,
        meshRef.current.position.z
      ]);

      // Find and update corresponding collision box
      const collisionBox = scene.children.find(child => 
        child instanceof THREE.Mesh && 
        child.geometry instanceof THREE.BoxGeometry &&
        child.material.visible === false &&
        Math.abs(child.position.x - position[0]) < 0.1 &&
        Math.abs(child.position.y - position[1]) < 0.1 &&
        Math.abs(child.position.z - position[2]) < 0.1
      );

      if (collisionBox) {
        collisionBox.position.copy(meshRef.current.position);
      }
    }
  }, [meshRef.current?.position.x, meshRef.current?.position.y, meshRef.current?.position.z, scene, position]);

  return (
    <>
      <mesh
        ref={meshRef}
        position={position}
        castShadow
        onClick={handleClick}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial 
          color={color}
          emissive={isSelected ? "#ffffff" : "#000000"}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
        {isSelected && <axesHelper args={[2]} />}
        {isSelected && (
          <meshBasicMaterial
            attach="material-outline"
            color="#ffffff"
            side={THREE.BackSide}
            transparent
            opacity={0.5}
          />
        )}
      </mesh>

      {isSelected && meshRef.current && (
        <>
          <TransformControls
            object={meshRef.current}
            mode="translate"
            onObjectChange={() => {
              if (meshRef.current) {
                setCurrentPosition([
                  meshRef.current.position.x,
                  meshRef.current.position.y,
                  meshRef.current.position.z
                ]);
              }
            }}
          />
          <Html
            position={[
              currentPosition[0],
              currentPosition[1] + size[1] + 0.5,
              currentPosition[2]
            ]}
            center
            style={{
              background: 'rgba(0,0,0,0.8)',
              padding: '8px',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}
          >
            <div>
              <strong>{name}</strong><br />
              x: {currentPosition[0].toFixed(2)}<br />
              y: {currentPosition[1].toFixed(2)}<br />
              z: {currentPosition[2].toFixed(2)}
            </div>
          </Html>
        </>
      )}
    </>
  );
}