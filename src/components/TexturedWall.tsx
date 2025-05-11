import { useRef, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface TexturedWallProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  name: string;
  textureUrl?: string;
}

export function TexturedWall({ position, size, color, isSelected, onSelect, name, textureUrl }: TexturedWallProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [currentPosition, setCurrentPosition] = useState(position);
  const { scene } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [textureError, setTextureError] = useState<boolean>(false);

  useEffect(() => {
    if (textureUrl) {
      // Reset states when URL changes
      setTexture(null);
      setTextureError(false);

      const loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      
      // Fallback texture URL - a neutral pattern from a reliable CDN
      const fallbackUrl = 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1000&auto=format&fit=crop';
      
      const loadTexture = (url: string, isFallback = false) => {
        loader.load(
          url, 
          (loadedTexture) => {
            loadedTexture.needsUpdate = true;
            loadedTexture.encoding = THREE.sRGBEncoding;
            loadedTexture.flipY = true;
            
            // Calculate aspect ratios
            const wallWidth = size[0];
            const wallHeight = size[1];
            const imageAspect = loadedTexture.image.width / loadedTexture.image.height;
            const wallAspect = wallWidth / wallHeight;
            
            // Adjust repeat to maintain aspect ratio
            if (imageAspect > wallAspect) {
              const scale = wallAspect / imageAspect;
              loadedTexture.repeat.set(1, scale);
              loadedTexture.offset.set(0, (1 - scale) / 2);
            } else {
              const scale = imageAspect / wallAspect;
              loadedTexture.repeat.set(scale, 1);
              loadedTexture.offset.set((1 - scale) / 2, 0);
            }
            
            loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
            loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
            loadedTexture.minFilter = THREE.LinearFilter;
            loadedTexture.magFilter = THREE.LinearFilter;
            loadedTexture.generateMipmaps = true;
            
            setTexture(loadedTexture);
            setTextureError(false);
          },
          undefined,
          () => {
            if (!isFallback) {
              console.warn(`Failed to load texture: ${url}, trying fallback...`);
              loadTexture(fallbackUrl, true);
            } else {
              console.error('Failed to load both primary and fallback textures');
              setTextureError(true);
            }
          }
        );
      };

      loadTexture(textureUrl);
    }
  }, [textureUrl, size]);
  
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
      {/* Textured wall */}
      <mesh
        ref={meshRef}
        position={[position[0], position[1], -9.88]}
        castShadow
        onClick={handleClick}
      >
        <planeGeometry args={[size[0], size[1]]} />
        <meshStandardMaterial 
          color={textureError ? color : '#ffffff'}
          map={texture}
          transparent={true}
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Solid wall behind the texture */}
      <mesh
        position={position}
        castShadow
      >
        <boxGeometry args={size} />
        <meshStandardMaterial 
          color={color}
          emissive={isSelected ? "#ffffff" : "#000000"}
          emissiveIntensity={isSelected ? 0.2 : 0}
          transparent={true}
          opacity={texture ? 0.5 : 1}
        />
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
              {textureError && <br />}<span style={{ color: 'red' }}>{textureError ? 'Texture failed to load' : ''}</span>
            </div>
          </Html>
        </>
      )}
    </>
  );
}