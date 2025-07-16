import React from 'react';
import { cn } from '@/lib/utils';

export interface Material {
  id: string;
  name: string;
  color?: string;
  texture?: string;
  preview: string; // CSS background or image URL
}

interface MaterialSelectorProps {
  materials: Material[];
  selectedMaterial: string | null;
  onMaterialSelect: (materialId: string) => void;
  className?: string;
}

export const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  materials,
  selectedMaterial,
  onMaterialSelect,
  className
}) => {
  return (
    <div className={cn("mobile-panel bg-background/10 backdrop-blur-sm border border-white/20", className)}>
      <h4 className="text-xs font-medium text-foreground mb-2">Materials</h4>
      <div className="horizontal-scroll">
        {materials.map((material) => (
          <button
            key={material.id}
            onClick={() => onMaterialSelect(material.id)}
            className={cn(
              "material-circle flex-shrink-0 relative overflow-hidden",
              selectedMaterial === material.id && "selected"
            )}
            style={{
              background: material.preview,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Gradient overlay for better visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            
            {/* Material name tooltip */}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-foreground/80 whitespace-nowrap">
              {material.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Predefined materials for common objects
export const chairMaterials: Material[] = [
  {
    id: 'leather-brown',
    name: 'Brown Leather',
    color: '#8B4513',
    preview: 'linear-gradient(135deg, #8B4513, #A0522D)'
  },
  {
    id: 'leather-black',
    name: 'Black Leather',
    color: '#1a1a1a',
    preview: 'linear-gradient(135deg, #1a1a1a, #333333)'
  },
  {
    id: 'fabric-gray',
    name: 'Gray Fabric',
    color: '#6B7280',
    preview: 'linear-gradient(135deg, #6B7280, #9CA3AF)'
  },
  {
    id: 'fabric-blue',
    name: 'Blue Fabric',
    color: '#3B82F6',
    preview: 'linear-gradient(135deg, #3B82F6, #60A5FA)'
  },
  {
    id: 'wood-oak',
    name: 'Oak Wood',
    color: '#DEB887',
    preview: 'linear-gradient(135deg, #DEB887, #F5DEB3)'
  },
  {
    id: 'wood-walnut',
    name: 'Walnut',
    color: '#654321',
    preview: 'linear-gradient(135deg, #654321, #8B4513)'
  },
  {
    id: 'metal-chrome',
    name: 'Chrome',
    color: '#C0C0C0',
    preview: 'linear-gradient(135deg, #C0C0C0, #E6E6FA)'
  },
  {
    id: 'metal-black',
    name: 'Black Metal',
    color: '#2C2C2C',
    preview: 'linear-gradient(135deg, #2C2C2C, #4A4A4A)'
  }
];

export const sofaMaterials: Material[] = [
  {
    id: 'velvet-emerald',
    name: 'Emerald Velvet',
    color: '#50C878',
    preview: 'linear-gradient(135deg, #50C878, #7FFFD4)'
  },
  {
    id: 'velvet-burgundy',
    name: 'Burgundy Velvet',
    color: '#800020',
    preview: 'linear-gradient(135deg, #800020, #B22222)'
  },
  {
    id: 'linen-beige',
    name: 'Beige Linen',
    color: '#F5F5DC',
    preview: 'linear-gradient(135deg, #F5F5DC, #FFFACD)'
  },
  {
    id: 'cotton-white',
    name: 'White Cotton',
    color: '#FFFFFF',
    preview: 'linear-gradient(135deg, #FFFFFF, #F8F8FF)'
  },
  ...chairMaterials.filter(m => m.id.includes('leather'))
];

export const getModelMaterials = (modelName: string): Material[] => {
  const lowerName = modelName.toLowerCase();
  
  if (lowerName.includes('chair')) {
    return chairMaterials;
  } else if (lowerName.includes('sofa') || lowerName.includes('couch')) {
    return sofaMaterials;
  } else if (lowerName.includes('table')) {
    return chairMaterials.filter(m => m.id.includes('wood') || m.id.includes('metal'));
  }
  
  // Default materials for other objects
  return [
    {
      id: 'default-red',
      name: 'Red',
      color: '#EF4444',
      preview: 'linear-gradient(135deg, #EF4444, #F87171)'
    },
    {
      id: 'default-blue',
      name: 'Blue',
      color: '#3B82F6',
      preview: 'linear-gradient(135deg, #3B82F6, #60A5FA)'
    },
    {
      id: 'default-green',
      name: 'Green',
      color: '#10B981',
      preview: 'linear-gradient(135deg, #10B981, #34D399)'
    },
    {
      id: 'default-purple',
      name: 'Purple',
      color: '#8B5CF6',
      preview: 'linear-gradient(135deg, #8B5CF6, #A78BFA)'
    }
  ];
};