import { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Hand, X } from 'lucide-react';

interface InteractiveObject3DProps {
  position: [number, number, number];
  children: React.ReactNode;
  description: string;
  title: string;
  interactionDistance?: number;
  onInteractionChange?: (isInteracting: boolean) => void;
}

export function InteractiveObject3D({ 
  position, 
  children, 
  description,
  title,
  interactionDistance = 3,
  onInteractionChange
}: InteractiveObject3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, scene } = useThree();
  const [isNearby, setIsNearby] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [showHand, setShowHand] = useState(false);
  const originalPosition = useRef<THREE.Vector3>(new THREE.Vector3(...position));
  const originalRotation = useRef<THREE.Euler>(new THREE.Euler());
  const cameraPosition = useRef<THREE.Vector3>(new THREE.Vector3());
  const cameraRotation = useRef<THREE.Euler>(new THREE.Euler());
  const overlayRef = useRef<THREE.Mesh | null>(null);
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const initialRotation = useRef<THREE.Euler>(new THREE.Euler());
  const targetRotation = useRef<THREE.Euler>(new THREE.Euler());
  const autoRotationSpeed = 0.15;

  // Constants for rotation limits (in radians)
  const MAX_ROTATION_X = THREE.MathUtils.degToRad(45);
  const MAX_ROTATION_Y = THREE.MathUtils.degToRad(90);
  const ROTATION_SMOOTHING = 0.1;

  // Handle cursor and camera state changes
  useEffect(() => {
    const updateCursorState = () => {
      if (isInspecting) {
        // State 2: Inspection Mode - Show cursor
        document.body.style.cursor = isDragging.current ? 'grabbing' : 'grab';
      } else {
        // State 1: Walking Mode - Hide cursor
        document.body.style.cursor = 'none';
      }
    };

    updateCursorState();

    // Store camera state during inspection
    if (isInspecting) {
      cameraPosition.current.copy(camera.position);
      cameraRotation.current.copy(camera.rotation);
    }

    return () => {
      document.body.style.cursor = 'none';
    };
  }, [isInspecting, isDragging.current, camera]);

  // Handle overlay creation/removal
  useEffect(() => {
    if (isInspecting && !overlayRef.current) {
      const overlay = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false
        })
      );
      overlay.renderOrder = -1;
      overlayRef.current = overlay;
      scene.add(overlay);
    } else if (!isInspecting && overlayRef.current) {
      scene.remove(overlayRef.current);
      overlayRef.current = null;
    }

    return () => {
      if (overlayRef.current) {
        scene.remove(overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [isInspecting, scene]);

  // Handle per-frame updates
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (isInspecting) {
      // State 2: Inspection Mode
      // Lock camera position during inspection
      camera.position.copy(cameraPosition.current);
      camera.rotation.copy(cameraRotation.current);

      // Apply smooth rotation only when not dragging
      if (!isDragging.current) {
        groupRef.current.rotation.x += (targetRotation.current.x - groupRef.current.rotation.x) * ROTATION_SMOOTHING;
        groupRef.current.rotation.y += (targetRotation.current.y - groupRef.current.rotation.y) * ROTATION_SMOOTHING;
      }

      // Update overlay position
      if (overlayRef.current) {
        const direction = new THREE.Vector3();
        direction.subVectors(groupRef.current.position, camera.position).normalize();
        
        const distance = 0.5;
        const overlayPosition = groupRef.current.position.clone()
          .sub(direction.multiplyScalar(distance));

        overlayRef.current.position.copy(overlayPosition);
        overlayRef.current.lookAt(camera.position);

        const distanceToCamera = camera.position.distanceTo(overlayPosition);
        const scale = distanceToCamera * 1.5;
        overlayRef.current.scale.set(scale, scale, 1);
      }
    } else {
      // State 1: Idle Mode - Continuous rotation only on Y axis
      groupRef.current.rotation.y += delta * Math.PI * autoRotationSpeed;
      // Lock X and Z rotation
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.z = 0;
    }
  });

  // Handle proximity detection
  useEffect(() => {
    if (!groupRef.current) return;
    
    const checkDistance = () => {
      if (!groupRef.current || isInspecting) return;
      
      const distance = camera.position.distanceTo(groupRef.current.position);
      setIsNearby(distance < interactionDistance);
      
      if (distance < interactionDistance) {
        const direction = new THREE.Vector3();
        const objectDirection = new THREE.Vector3();
        
        camera.getWorldDirection(direction);
        objectDirection.subVectors(groupRef.current.position, camera.position).normalize();
        
        const angle = direction.angleTo(objectDirection);
        setShowHand(angle < 0.5 && !isInspecting);
      } else {
        setShowHand(false);
      }
    };

    const animate = () => {
      if (!isInspecting) {
        checkDistance();
      }
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      setShowHand(false);
      setIsNearby(false);
    };
  }, [camera, interactionDistance, isInspecting]);

  const handleClick = () => {
    if (!isNearby || !groupRef.current || isInspecting) return;
    
    // Store original state
    originalPosition.current.copy(groupRef.current.position);
    originalRotation.current.copy(groupRef.current.rotation);
    
    // Position object in front of camera
    const distance = 2;
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    const newPosition = camera.position.clone()
      .add(cameraDirection.multiplyScalar(distance));
    
    // Reset object rotation for inspection
    groupRef.current.position.copy(newPosition);
    groupRef.current.rotation.set(0, 0, 0);
    initialRotation.current.set(0, 0, 0);
    targetRotation.current.set(0, 0, 0);
    
    setIsInspecting(true);
    onInteractionChange?.(true);
  };

  const handleExitInspection = () => {
    if (!groupRef.current) return;

    // Restore original state
    groupRef.current.position.copy(originalPosition.current);
    groupRef.current.rotation.copy(originalRotation.current);
    
    setIsInspecting(false);
    onInteractionChange?.(false);
    isDragging.current = false;
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (!isInspecting) return;
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !groupRef.current || !isInspecting) return;

    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    // Calculate new rotations
    const newRotationY = groupRef.current.rotation.y + deltaX * 0.01;
    const newRotationX = groupRef.current.rotation.x + deltaY * 0.01;

    // Apply rotation limits
    targetRotation.current.y = THREE.MathUtils.clamp(
      newRotationY,
      initialRotation.current.y - MAX_ROTATION_Y,
      initialRotation.current.y + MAX_ROTATION_Y
    );

    targetRotation.current.x = THREE.MathUtils.clamp(
      newRotationX,
      initialRotation.current.x - MAX_ROTATION_X,
      initialRotation.current.x + MAX_ROTATION_X
    );

    // Direct update during drag
    groupRef.current.rotation.copy(targetRotation.current);

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    if (!isInspecting) return;
    isDragging.current = false;
    document.body.style.cursor = 'grab';
  };

  // Setup and cleanup event listeners
  useEffect(() => {
    if (isInspecting) {
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isInspecting]);

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
    >
      {children}
      
      {showHand && !isInspecting && (
        <Html
          center
          position={[0, 1.5, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-black bg-opacity-50 p-2 rounded-full transform -translate-y-full">
            <Hand className="w-6 h-6 text-white" />
          </div>
        </Html>
      )}
      
      {isInspecting && (
        <Html
          style={{
            position: 'fixed',
            top: '24px',
            left: '24px',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <div className="bg-black bg-opacity-75 p-4 rounded-lg text-white select-none">
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-sm text-gray-300">{description}</p>
              </div>
              <div className="text-xs text-gray-400">
                Click and drag to rotate the object
              </div>
              <button
                onClick={handleExitInspection}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 w-full pointer-events-auto text-sm"
              >
                <X className="w-4 h-4" />
                Exit Inspection
              </button>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}