import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Lock, Unlock, RotateCw, Move, ZoomIn, Smartphone, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MaterialSelector, getModelMaterials, type Material } from './MaterialSelector';

interface ARModel {
  id: string;
  name: string;
  model: THREE.Object3D;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  locked: boolean;
  selectedMaterial: string | null;
  materials: Material[];
}

interface MindFile {
  name: string;
  file: File;
}

interface GLBFile {
  name: string;
  file: File;
}

export const ARCamera: React.FC = () => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // State
  const [cameraActive, setCameraActive] = useState(false);
  const [mindFiles, setMindFiles] = useState<MindFile[]>([]);
  const [glbFiles, setGLBFiles] = useState<GLBFile[]>([]);
  const [arModels, setArModels] = useState<ARModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [controlMode, setControlMode] = useState<'move' | 'rotate' | 'scale'>('move');
  const [isMobile, setIsMobile] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Initialize camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    
    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    
    // Add to DOM
    mountRef.current.appendChild(renderer.domElement);
    
    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast({
        title: 'Camera Error',
        description: 'Could not access the camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Spawn a 3D model
  const spawnModel = async (modelName: string) => {
    if (!sceneRef.current) return;
    if (isLoading) return;

    setIsLoading(true);
    setActiveModel(modelName);

    try {
      // Show loading state
      toast({
        title: 'Loading Model',
        description: `Loading ${modelName}...`,
      });

      // Load GLB model
      const loader = new GLTFLoader();
      const glbPath = `/3d/${modelName}.glb`;
      
      const gltf = await new Promise<THREE.Group>((resolve, reject) => {
        loader.load(
          glbPath,
          (gltf) => resolve(gltf.scene),
          (xhr) => {
            // Progress callback
            const percent = Math.round((xhr.loaded / (xhr.total || 1)) * 100);
            toast({
              title: 'Loading',
              description: `Loading ${modelName}... ${percent}%`,
            });
          },
          (error) => {
            console.error('GLTFLoader error:', error);
            reject(new Error('Failed to load model'));
          }
        );
      });

      // Position the model
      if (cameraRef.current) {
        const direction = new THREE.Vector3();
        cameraRef.current.getWorldDirection(direction);
        direction.multiplyScalar(2);
        gltf.position.copy(cameraRef.current.position).add(direction);
      } else {
        gltf.position.set(0, 0, -5);
      }

      // Set initial scale
      const box = new THREE.Box3().setFromObject(gltf);
      const size = box.getSize(new THREE.Vector3()).length();
      const scale = 1.5 / size;
      gltf.scale.set(scale, scale, scale);

      // Add to scene
      sceneRef.current.add(gltf);

      // Create model data
      const modelMaterials = getModelMaterials(modelName);
      const newModel: ARModel = {
        id: `${modelName}-${Date.now()}`,
        name: modelName,
        model: gltf,
        position: gltf.position.clone(),
        rotation: gltf.rotation.clone(),
        scale: gltf.scale.clone(),
        locked: false,
        selectedMaterial: modelMaterials[0]?.id || null,
        materials: modelMaterials,
      };

      setArModels((prev) => [...prev, newModel]);
      setSelectedModel(newModel.id);

      toast({
        title: 'Model Loaded',
        description: `${modelName} has been placed in the scene.`,
      });
    } catch (error) {
      console.error('Error loading model:', error);
      toast({
        title: 'Error',
        description: `Failed to load ${modelName}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setActiveModel(null);
    }
  };

  // Transform model
  const transformModel = (modelId: string, delta: { x?: number; y?: number; z?: number }) => {
    setArModels((prev) =>
      prev.map((model) => {
        if (model.id === modelId && !model.locked) {
          if (delta.x !== undefined) model.model.position.x += delta.x;
          if (delta.y !== undefined) model.model.position.y += delta.y;
          if (delta.z !== undefined) model.model.position.z += delta.z;
          return { ...model, position: model.model.position.clone() };
        }
        return model;
      })
    );
  };

  // Toggle model lock
  const toggleModelLock = (modelId: string) => {
    setArModels((prev) =>
      prev.map((model) =>
        model.id === modelId ? { ...model, locked: !model.locked } : model
      )
    );
  };

  // Start AR experience
  const startARExperience = () => {
    setHasStarted(true);
    startCamera();
  };

  // Show start screen if not started
  if (!hasStarted) {
    return (
      <div className="relative h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md mx-auto bg-card p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-4">AR Snap & Stay</h1>
          <p className="text-muted-foreground mb-6">
            Experience augmented reality by placing 3D models in your environment.
          </p>
          
          {isMobile ? (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                Works best in landscape mode. Make sure to allow camera access when prompted.
              </p>
              <Button 
                onClick={startARExperience}
                className="w-full py-6 text-lg"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Start AR Experience
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-yellow-600 dark:text-yellow-400 text-sm mb-4">
                For the best experience, please use a mobile device with AR capabilities.
              </p>
              <Button 
                onClick={startARExperience}
                className="w-full py-6 text-lg"
                size="lg"
                variant="outline"
              >
                <Camera className="mr-2 h-5 w-5" />
                Try on Desktop (Limited)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Desktop experience is limited to 3D model viewing without AR tracking
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main AR interface
  return (
    <div className="relative h-screen w-full">
      {/* Video feed */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
        playsInline
        muted
        autoPlay
      />

      {/* Canvas for Three.js rendering */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Controls overlay */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setControlMode('move')}
          className={controlMode === 'move' ? 'bg-primary/20' : ''}
        >
          <Move className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setControlMode('rotate')}
          className={controlMode === 'rotate' ? 'bg-primary/20' : ''}
        >
          <RotateCw className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setControlMode('scale')}
          className={controlMode === 'scale' ? 'bg-primary/20' : ''}
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
      </div>

      {/* Model selection */}
      <div className="absolute top-4 left-0 right-0 flex justify-center space-x-2 overflow-x-auto p-2">
        {['sofa', 'chair', 'table', 'lamp'].map((model) => (
          <Button
            key={model}
            variant="outline"
            onClick={() => spawnModel(model)}
            disabled={isLoading}
            className="capitalize"
          >
            {isLoading && activeModel === model ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {model}
          </Button>
        ))}
      </div>

      {/* Model controls */}
      {selectedModel && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 space-y-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              const model = arModels.find((m) => m.id === selectedModel);
              if (model) toggleModelLock(model.id);
            }}
          >
            {arModels.find((m) => m.id === selectedModel)?.locked ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Unlock className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              setArModels((prev) =>
                prev.filter((model) => model.id !== selectedModel)
              );
              setSelectedModel(null);
            }}
          >
            
          </Button>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-background p-4 rounded-lg shadow-lg flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Loading {activeModel}...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARCamera;
