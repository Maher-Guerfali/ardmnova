import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Scene, Mesh, BoxGeometry, MeshStandardMaterial } from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple scene with a cube
const scene = new Scene();
const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshStandardMaterial({ color: 0x00ff00 });
const cube = new Mesh(geometry, material);
scene.add(cube);

// Export to GLB
const exporter = new GLTFExporter();
const outputPath = path.join(__dirname, '../public/3d/sofa.glb');

// Create directory if it doesn't exist
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

exporter.parse(scene, (glb) => {
  fs.writeFileSync(outputPath, Buffer.from(glb));
  console.log(`Created sample GLB model at: ${outputPath}`);
  
  // Also create a sample mind file
  const mindPath = path.join(__dirname, '../public/minds/sofa.mind');
  const mindContent = JSON.stringify({
    name: "sofa",
    version: 1,
    imageTargets: [
      {
        image: "sofa_target.jpg",
        width: 1.0,
        height: 1.0
      }
    ]
  }, null, 2);
  
  fs.writeFileSync(mindPath, mindContent);
  console.log(`Created sample MIND file at: ${mindPath}`);
  
  // Generate asset indices
  const { default: generateIndex } = await import('./generate-asset-index.js');
  await generateIndex();
});
