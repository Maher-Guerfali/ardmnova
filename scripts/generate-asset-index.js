import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to generate index.json for a directory
function generateIndex(directory, extension) {
  const fullPath = path.join(__dirname, '..', 'public', directory);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${fullPath}`);
  }

  // Read directory and filter files by extension
  const files = fs.readdirSync(fullPath)
    .filter(file => file.endsWith(extension))
    .sort();

  // Write index.json
  const indexPath = path.join(fullPath, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(files, null, 2));
  console.log(`Generated ${indexPath} with ${files.length} files`);
}

// Main function
export default function main() {
  // Generate indices for both 3D models and mind files
  generateIndex('3d', '.glb');
  generateIndex('minds', '.mind');
  console.log('Asset index generation complete!');
  return true;
}

// Run if this is the main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
