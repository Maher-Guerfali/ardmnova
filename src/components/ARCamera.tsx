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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [mindFiles, setMindFiles] = useState<MindFile[]>([]);
  const [glbFiles, setGLBFiles] = useState<GLBFile[]>([]);
  const [arModels, setArModels] = useState<ARModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [controlMode, setControlMode] = useState<'move' | 'rotate' | 'scale'>('move');
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Block non-mobile access
  if (!isMobile) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <Smartphone className="w-16 h-16 mx-auto mb-4 text-ar-primary" />
          <h1 className="text-2xl font-bold mb-2">Mobile Only</h1>
          <p className="text-muted-foreground">
            This AR experience is designed for mobile devices. Please access it from your smartphone or tablet.
          </p>
        </div>
      </div>
    );
  }

  // Load available models and mind files on component mount
  useEffect(() => {
    // Load mind files
    const loadMindFiles = async () => {
      try {
        const response = await fetch('/minds/index.json');
        const files = await response.json();
        const mindFiles = files.map((file: string) => ({
          name: file.replace('.mind', ''),
          file: new File([], file)
        }));
        setMindFiles(mindFiles);
      } catch (error) {
        console.warn('No mind files found or error loading mind files');
      }
    };

    // Load 3D models
    const loadModels = async () => {
      try {
        const response = await fetch('/3d/index.json');
        const files = await response.json();
        const glbFiles = files.map((file: string) => ({
          name: file.replace('.glb', ''),
          file: new File([], file)
        }));
        setGLBFiles(glbFiles);
      } catch (error) {
        console.warn('No 3D models found or error loading models');
      }
    };

    loadMindFiles();
    loadModels();
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current || !cameraActive) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    
    mountRef.current.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    camera.position.z = 5;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [cameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        toast({
          title: "Camera Started",
          description: "AR camera is now active. Upload .mind and .glb files to begin tracking.",
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // This function is no longer needed as we're loading from public directory
  const handleMindFileUpload = () => {
    toast({
      title: "Info",
      description: "Please place MIND files in the public/minds directory and restart the server.",
      variant: "default",
    });
  };

  // This function is no longer needed as we're loading from public directory
  const handleGLBFileUpload = () => {
    toast({
      title: "Info",
      description: "Please place GLB files in the public/3d directory and restart the server.",
      variant: "default",
    });
  };

  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  const spawnModel = async (modelName: string) => {
    if (!sceneRef.current) return;
    if (isLoading) return; // Prevent multiple clicks

    setIsLoading(true);
    setActiveModel(modelName);
    let loadingMessage = `Loading ${modelName}...`;

    // Show loading state
    toast({
      title: "Loading Model",
      description: loadingMessage,
      variant: "default",
    });

    try {
      // Load GLB model
      const loader = new GLTFLoader();
      const glbPath = `/3d/${modelName}.glb`;
      
      // Load the GLB file with progress tracking
      const gltf = await new Promise<THREE.Group>((resolve, reject) => {
        loader.load(
          glbPath,
          (gltf) => {
            resolve(gltf.scene);
          },
          (xhr) => {
            // Progress callback
            const percent = Math.round((xhr.loaded / (xhr.total || 1)) * 100);
            loadingMessage = `Loading ${modelName}... ${percent}%`;
            // Show updated progress
            toast({
              title: "Loading Model",
              description: loadingMessage,
              variant: "default",
            });
          },
          (error) => {
            console.error('GLTFLoader error:', error);
            reject(new Error(`Failed to load model: `));
          }
        );
      });

      // Position the model in front of the camera
      if (cameraRef.current) {
        const direction = new THREE.Vector3();
        cameraRef.current.getWorldDirection(direction);
        direction.multiplyScalar(2); // 2 units in front of camera
        gltf.position.copy(cameraRef.current.position).add(direction);
      } else {
        // Fallback position if camera is not available
        gltf.position.set(
          (Math.random() - 0.5) * 2,
          0,
          (Math.random() - 0.5) * 2 - 2
        );
      }

      // Set initial scale
      const box = new THREE.Box3().setFromObject(gltf);
      const size = box.getSize(new THREE.Vector3()).length();
      const scale = 1.5 / size; // Normalize model size
      gltf.scale.set(scale, scale, scale);

      // Enable shadows if needed
      gltf.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Load corresponding mind file if it exists
      try {
        const mindPath = `/minds/${modelName}.mind`;
        const response = await fetch(mindPath);
        if (response.ok) {
          const mindData = await response.json();
          console.log(`Loaded mind data for ${modelName}:`, mindData);
          
          toast({
            title: "Tracking Data Loaded",
            description: `Successfully loaded tracking data for ${modelName}.`,
            duration: 3000,
          });
        }
      } catch (error) {
        console.warn(`No mind file found for ${modelName}:`, error);
      }

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
        materials: modelMaterials
      };

      sceneRef.current.add(gltf);
      setArModels(prev => [...prev, newModel]);

      // Show success
      toast({
        title: "Model Loaded",
        description: `${modelName} has been placed in the scene.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error loading model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error Loading Model",
        description: `Failed to load ${modelName}. ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setActiveModel(null);
    }
  };

  const toggleModelLock = (modelId: string) => {
    setArModels(prev => prev.map(model => 
      model.id === modelId ? { ...model, locked: !model.locked } : model
    ));
    
    const model = arModels.find(m => m.id === modelId);
    toast({
      title: model?.locked ? "Model Unlocked" : "Model Locked",
      description: model?.locked 
        ? "Model can now move with image tracking." 
        : "Model will stay in place even without image reference.",
    });
  };

  const transformModel = (modelId: string, delta: { x?: number, y?: number, z?: number }) => {
    const modelData = arModels.find(m => m.id === modelId);
    if (!modelData || modelData.locked) return;

    const { model } = modelData;
    
    switch (controlMode) {
      case 'move':
        model.position.x += delta.x || 0;
        model.position.y += delta.y || 0;
        model.position.z += delta.z || 0;
        break;
      case 'rotate':
        model.rotation.x += delta.x || 0;
        model.rotation.y += delta.y || 0;
        model.rotation.z += delta.z || 0;
        break;
      case 'scale':
        const scaleFactor = 1 + (delta.x || 0) * 0.1;
        model.scale.multiplyScalar(scaleFactor);
        break;
    }
  };

  const handleMaterialSelect = (modelId: string, materialId: string) => {
    setArModels(prev => prev.map(model => {
      if (model.id === modelId) {
        const material = model.materials.find(m => m.id === materialId);
        if (material && model.model instanceof THREE.Mesh) {
          // Apply material color to the model
          (model.model.material as THREE.MeshPhongMaterial).color.setHex(
            parseInt(material.color?.replace('#', '') || 'ffffff', 16)
          );
        }
        return { ...model, selectedMaterial: materialId };
      }
      return model;
    }));

    toast({
      title: "Material Applied",
      description: "Model material has been updated successfully.",
    });
  };

  return (
    <div className="relative h-screen bg-background overflow-hidden">
      {/* Video Background */}
      {cameraActive && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Three.js AR Overlay */}
      {cameraActive && (
        <div 
          ref={mountRef} 
          className="absolute inset-0 pointer-events-none"
          style={{ mixBlendMode: 'normal' }}
        />
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top UI - Mobile Optimized */}
        <div className="absolute top-4 left-4 right-4 pointer-events-auto">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-bold text-foreground bg-background/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
                AR Experiences
              </h1>
              
              {cameraActive && (
                <Button variant="destructive" size="sm" onClick={stopCamera}>
                  Stop
                </Button>
              )}
            </div>
            
            {!cameraActive && (
              <Button 
                variant="ar" 
                size="xl" 
                onClick={startCamera}
                className="animate-pulse-ar w-full mobile-button"
              >
                <Camera className="w-6 h-6" />
                Start AR Camera
              </Button>
            )}
          </div>
        </div>

        {/* File Upload Section - Mobile Optimized */}
        {cameraActive && (
          <div className="absolute top-24 left-4 right-4 flex flex-col gap-2 pointer-events-auto">
            <div className="mobile-panel bg-background/10 backdrop-blur-sm border border-white/20">
              <h3 className="text-xs font-medium text-foreground mb-2 mobile-ui">Upload Files</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept=".mind"
                    onChange={handleMindFileUpload}
                    className="hidden"
                  />
                  <Button variant="ar-outline" size="sm" className="w-full mobile-button text-xs">
                    <Upload className="w-3 h-3" />
                    .mind files
                  </Button>
                </label>
                
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept=".glb"
                    onChange={handleGLBFileUpload}
                    className="hidden"
                  />
                  <Button variant="ar-outline" size="sm" className="w-full mobile-button text-xs">
                    <Upload className="w-3 h-3" />
                    .glb files
                  </Button>
                </label>
              </div>
            </div>

            {/* Available Models - Mobile Grid */}
            {mindFiles.length > 0 && glbFiles.length > 0 && (
              <div className="mobile-panel bg-background/10 backdrop-blur-sm border border-white/20">
                <h3 className="text-xs font-medium text-foreground mb-2 mobile-ui">Available Models</h3>
                <div className="grid grid-cols-2 gap-1">
                  {mindFiles.map((mindFile) => {
                    const hasGLB = glbFiles.some(glb => glb.name === mindFile.name);
                    return (
                      <Button
                        key={mindFile.name}
                        variant={hasGLB ? "ar-glass" : "ghost"}
                        size="sm"
                        disabled={!hasGLB}
                        onClick={() => hasGLB && spawnModel(mindFile.name)}
                        className="text-xs mobile-button"
                      >
                        {mindFile.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Control Panel - Mobile Optimized */}
        {cameraActive && arModels.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 pointer-events-auto max-h-64 overflow-y-auto">
            <div className="mobile-panel bg-background/10 backdrop-blur-sm border border-white/20 space-y-3">
              <h3 className="text-xs font-medium text-foreground mobile-ui">AR Models</h3>
              
              {/* Model Selection */}
              <div className="grid grid-cols-1 gap-2">
                {arModels.map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-2 bg-background/5 rounded border border-white/10">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={selectedModel === model.id ? "ar" : "ar-glass"}
                        size="sm"
                        onClick={() => setSelectedModel(model.id)}
                        className="text-xs mobile-button"
                      >
                        {model.name}
                      </Button>
                      <Button
                        variant={model.locked ? "ar-lock" : "ar-outline"}
                        size="sm"
                        onClick={() => toggleModelLock(model.id)}
                        className="mobile-button"
                      >
                        {model.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Model Controls */}
              {selectedModel && (() => {
                const currentModel = arModels.find(m => m.id === selectedModel);
                return (
                  <div className="space-y-3">
                    {/* Transform Controls */}
                    <div className="flex gap-1">
                      <Button
                        variant={controlMode === 'move' ? "ar" : "ar-outline"}
                        size="sm"
                        onClick={() => setControlMode('move')}
                        className="flex-1 mobile-button text-xs"
                      >
                        <Move className="w-3 h-3" />
                        Move
                      </Button>
                      <Button
                        variant={controlMode === 'rotate' ? "ar" : "ar-outline"}
                        size="sm"
                        onClick={() => setControlMode('rotate')}
                        className="flex-1 mobile-button text-xs"
                      >
                        <RotateCw className="w-3 h-3" />
                        Rotate
                      </Button>
                      <Button
                        variant={controlMode === 'scale' ? "ar" : "ar-outline"}
                        size="sm"
                        onClick={() => setControlMode('scale')}
                        className="flex-1 mobile-button text-xs"
                      >
                        <ZoomIn className="w-3 h-3" />
                        Scale
                      </Button>
                    </div>
                    
                    {/* Material Selector */}
                    {currentModel && currentModel.materials.length > 0 && (
                      <MaterialSelector
                        materials={currentModel.materials}
                        selectedMaterial={currentModel.selectedMaterial}
                        onMaterialSelect={(materialId) => handleMaterialSelect(selectedModel, materialId)}
                      />
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* AR Targeting Overlay - Mobile Optimized */}
        {cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 border-2 border-ar-primary border-dashed rounded-lg animate-pulse-ar">
              <div className="absolute inset-1 border border-ar-primary/50 rounded-md"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 bg-ar-primary rounded-full animate-ping"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};