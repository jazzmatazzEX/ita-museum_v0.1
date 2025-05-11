import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface TextureTestProps {
  position: [number, number, number];
}

export function TextureTest({ position }: TextureTestProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture] = useState(() => {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDuB09POk4Lg3o-lj43gT4a1lJzcJfZvy_Lg&s',
      (loadedTexture) => {
        loadedTexture.needsUpdate = true;
        loadedTexture.encoding = THREE.sRGBEncoding;
        loadedTexture.flipY = true; // Changed to true to flip the texture
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
      }
    );
    return texture;
  });

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      position={position}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial
        map={texture}
        transparent={true}
        side={THREE.DoubleSide}
        roughness={0.5}
        metalness={0.5}
      />
    </mesh>
  );
}