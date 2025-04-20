
export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  tags: string[];
  status: 'Draft' | 'Processing' | 'Complete';
  description?: string;
}

export const productData: Product[] = [
  {
    id: "1",
    name: "Industrial Epoxy Coating X-100",
    sku: "EP-X100-5L",
    category: "Industrial Coatings",
    tags: ["epoxy", "corrosion-resistant", "industrial"],
    status: "Complete",
    description: "High-performance epoxy coating designed for industrial environments requiring exceptional chemical and corrosion resistance."
  },
  {
    id: "2",
    name: "GlossGuard UV Protective Finish",
    sku: "GG-UV500-1L",
    category: "Protective Finishes",
    tags: ["UV-resistant", "glossy", "exterior"],
    status: "Complete",
    description: "Premium UV-resistant finish that provides long-lasting protection against sun damage while maintaining a high-gloss appearance."
  },
  {
    id: "3",
    name: "EcoSeal Water-Based Sealant",
    sku: "ES-WB250-2L",
    category: "Sealants",
    tags: ["eco-friendly", "water-based", "low-VOC"],
    status: "Processing",
    description: "Environmentally friendly water-based sealant with minimal VOC emissions, ideal for interior applications."
  },
  {
    id: "4",
    name: "ThermoShield Heat-Resistant Paint",
    sku: "TS-HR400-1L",
    category: "Specialty Coatings",
    tags: ["heat-resistant", "industrial", "high-temperature"],
    status: "Draft",
    description: "Specialized coating formulated to withstand temperatures up to 400°C, perfect for industrial equipment and machinery."
  },
  {
    id: "5",
    name: "MarineGuard Anti-Fouling Coating",
    sku: "MG-AF200-5L",
    category: "Marine Coatings",
    tags: ["marine", "anti-fouling", "waterproof"],
    status: "Complete",
    description: "Professional-grade anti-fouling coating that prevents marine growth on hulls and underwater structures."
  },
  {
    id: "6",
    name: "QuickDry Metal Primer",
    sku: "QD-MP150-1L",
    category: "Primers",
    tags: ["quick-drying", "metal", "rust-inhibiting"],
    status: "Processing",
    description: "Fast-drying primer specifically formulated for metal surfaces, providing excellent adhesion and rust prevention."
  },
  {
    id: "7",
    name: "FlexiCoat Elastomeric Membrane",
    sku: "FC-EM300-5L",
    category: "Waterproofing",
    tags: ["elastomeric", "waterproof", "flexible"],
    status: "Complete",
    description: "Highly flexible waterproofing membrane that can stretch and recover to bridge cracks and maintain waterproof integrity."
  },
  {
    id: "8",
    name: "DuraFloor Polyurethane Finish",
    sku: "DF-PU450-5L",
    category: "Floor Coatings",
    tags: ["polyurethane", "durable", "floor"],
    status: "Draft",
    description: "Hard-wearing polyurethane floor finish designed for high-traffic commercial and industrial environments."
  },
  {
    id: "9",
    name: "CeramicBond Thermal Insulation",
    sku: "CB-TI500-2L",
    category: "Insulation Coatings",
    tags: ["ceramic", "insulating", "energy-saving"],
    status: "Processing",
    description: "Advanced ceramic-based coating that provides thermal insulation and energy efficiency for various surfaces."
  },
  {
    id: "10",
    name: "FireGuard Intumescent Coating",
    sku: "FG-IC600-5L",
    category: "Fire Protection",
    tags: ["fire-resistant", "intumescent", "safety"],
    status: "Complete",
    description: "Specialized intumescent coating that expands when exposed to high temperatures, providing crucial fire protection for structural elements."
  }
];
