import { useRef, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useControls } from 'leva';

interface ControlsProps {
  isInteracting?: boolean;
}

export function Controls({ isInteracting = false }: ControlsProps) {
  const { camera, scene } = useThree();
  
  const {
    moveSpeed,
    acceleration,
    deceleration,
    collisionDistance,
    wallSlideForce
  } = useControls('Movement', {
    moveSpeed: { value: 2.8, min: 0.1, max: 10, step: 0.1 },
    acceleration: { value: 15.0, min: 0.1, max: 20, step: 0.1 },
    deceleration: { value: 8.0, min: 0.1, max: 10, step: 0.1 },
    collisionDistance: { value: 0.5, min: 0.1, max: 3, step: 0.1 },
    wallSlideForce: { value: 0.98, min: 0.1, max: 1, step: 0.01 }
  });
  
  const velocity = useRef(new THREE.Vector3());
  const targetVelocity = useRef(new THREE.Vector3());
  const lastTime = useRef(performance.now());
  const activeKeys = useRef(new Set<string>());
  const collisionNormal = useRef(new THREE.Vector3());
  const wallColliders = useRef<THREE.Mesh[]>([]);
  const raycaster = useRef(new THREE.Raycaster());
  
  useEffect(() => {
    const createWallCollider = (position: THREE.Vector3, size: THREE.Vector3) => {
      const wallGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const invisibleMaterial = new THREE.MeshBasicMaterial({ visible: false });
      const wall = new THREE.Mesh(wallGeometry, invisibleMaterial);
      wall.position.copy(position);
      scene.add(wall);
      wallColliders.current.push(wall);
      return wall;
    };

    const walls = [
      // Walls
      createWallCollider(new THREE.Vector3(0, 2.5, -10), new THREE.Vector3(10, 5, 0.2)),
      createWallCollider(new THREE.Vector3(-10, 2.5, -5), new THREE.Vector3(0.2, 5, 10)),
      createWallCollider(new THREE.Vector3(-10, 2.5, 5), new THREE.Vector3(0.2, 5, 10)),
      createWallCollider(new THREE.Vector3(10, 2.5, -5), new THREE.Vector3(0.2, 5, 10)),
      createWallCollider(new THREE.Vector3(10, 2.5, 5), new THREE.Vector3(0.2, 5, 10)),
      createWallCollider(new THREE.Vector3(-4, 2.5, 0), new THREE.Vector3(4, 5, 0.2)),
      createWallCollider(new THREE.Vector3(4, 2.5, 0), new THREE.Vector3(4, 5, 0.2)),
      createWallCollider(new THREE.Vector3(-5, 2.5, -5), new THREE.Vector3(0.2, 5, 5)),
      
      // Blue stands with larger collision boxes
      createWallCollider(new THREE.Vector3(-3, 1, 5), new THREE.Vector3(2.5, 2, 2.5)),
      createWallCollider(new THREE.Vector3(3, 1, 5), new THREE.Vector3(2.5, 2, 2.5)),
      createWallCollider(new THREE.Vector3(-3, 1, -5), new THREE.Vector3(2.5, 2, 2.5)),
      createWallCollider(new THREE.Vector3(3, 1, -5), new THREE.Vector3(2.5, 2, 2.5)),
      createWallCollider(new THREE.Vector3(7, 1, -5), new THREE.Vector3(2.5, 2, 4.5))
    ];

    const checkCollision = (newPosition: THREE.Vector3) => {
      const rays = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(1, 0, 1).normalize(),
        new THREE.Vector3(-1, 0, 1).normalize(),
        new THREE.Vector3(1, 0, -1).normalize(),
        new THREE.Vector3(-1, 0, -1).normalize(),
      ];

      let hasCollision = false;
      collisionNormal.current.set(0, 0, 0);
      
      for (const direction of rays) {
        raycaster.current.set(newPosition, direction);
        const intersects = raycaster.current.intersectObjects(wallColliders.current);
        
        if (intersects.length > 0 && intersects[0].distance < collisionDistance) {
          hasCollision = true;
          if (intersects[0].face) {
            const point = intersects[0].point;
            const pushDirection = new THREE.Vector3().subVectors(newPosition, point).normalize();
            collisionNormal.current.add(pushDirection);
          }
        }
      }
      
      if (hasCollision) {
        collisionNormal.current.normalize();
        
        const dot = velocity.current.dot(collisionNormal.current);
        
        if (dot < 0) {
          const pushBack = collisionNormal.current.clone().multiplyScalar(dot);
          velocity.current.sub(pushBack);
          
          const parallelVelocity = velocity.current.clone().projectOnPlane(collisionNormal.current);
          velocity.current.copy(parallelVelocity);
          
          velocity.current.multiplyScalar(wallSlideForce);
        }
        
        const pushDistance = collisionDistance - 0.05;
        newPosition.add(collisionNormal.current.multiplyScalar(pushDistance));
        
        return true;
      }
      return false;
    };

    const updateTargetVelocity = () => {
      if (isInteracting) {
        targetVelocity.current.set(0, 0, 0);
        return;
      }

      targetVelocity.current.set(0, 0, 0);
      
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera.quaternion);
      forward.y = 0;
      forward.normalize();
      
      const right = new THREE.Vector3(-1, 0, 0);
      right.applyQuaternion(camera.quaternion);
      right.y = 0;
      right.normalize();

      if (activeKeys.current.has('KeyW')) targetVelocity.current.add(forward.multiplyScalar(moveSpeed));
      if (activeKeys.current.has('KeyS')) targetVelocity.current.sub(forward.multiplyScalar(moveSpeed));
      if (activeKeys.current.has('KeyA')) targetVelocity.current.add(right.multiplyScalar(moveSpeed));
      if (activeKeys.current.has('KeyD')) targetVelocity.current.sub(right.multiplyScalar(moveSpeed));

      if (targetVelocity.current.lengthSq() > moveSpeed * moveSpeed) {
        targetVelocity.current.normalize().multiplyScalar(moveSpeed);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isInteracting) {
        activeKeys.current.add(event.code);
        updateTargetVelocity();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      activeKeys.current.delete(event.code);
      updateTargetVelocity();
    };

    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = Math.min((currentTime - lastTime.current) / 1000, 0.1);
      lastTime.current = currentTime;

      if (targetVelocity.current.lengthSq() > 0) {
        const lerpFactor = 1 - Math.exp(-acceleration * deltaTime);
        velocity.current.lerp(targetVelocity.current, lerpFactor);
      } else {
        const decelerationFactor = Math.exp(-deceleration * deltaTime);
        velocity.current.multiplyScalar(decelerationFactor);
      }

      if (velocity.current.lengthSq() > 0.0001 && !isInteracting) {
        const newPosition = camera.position.clone().add(
          velocity.current.clone().multiplyScalar(deltaTime)
        );
        
        if (!checkCollision(newPosition)) {
          camera.position.copy(newPosition);
        }
      }

      requestAnimationFrame(animate);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    animate();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      walls.forEach(wall => scene.remove(wall));
      wallColliders.current = [];
    };
  }, [camera, scene, moveSpeed, acceleration, deceleration, collisionDistance, wallSlideForce, isInteracting]);

  return null;
}