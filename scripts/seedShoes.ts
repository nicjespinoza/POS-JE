// Seed data for shoe inventory - Run with: npx ts-node scripts/seedShoes.ts
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ShoeProduct {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  brand: string;
  size: string[];
  color: string;
  sku: string;
}

const shoeProducts: ShoeProduct[] = [
  // Running Shoes
  {
    name: "Nike Air Zoom Pegasus 40",
    description: "Zapatillas de running versátiles con amortiguación responsive",
    price: 2899,
    stock: 45,
    category: "Running",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
    brand: "Nike",
    size: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11"],
    color: "Rojo/Blanco",
    sku: "NK-PG40-RW"
  },
  {
    name: "Adidas Ultraboost Light",
    description: "Máxima energía retorno con Boost ligero",
    price: 3299,
    stock: 32,
    category: "Running",
    image: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=500&q=80",
    brand: "Adidas",
    size: ["7", "8", "8.5", "9", "9.5", "10", "11", "12"],
    color: "Negro/Blanco",
    sku: "AD-UB-LT"
  },
  {
    name: "New Balance Fresh Foam X",
    description: "Amortiguación superior para largas distancias",
    price: 2599,
    stock: 28,
    category: "Running",
    image: "https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80",
    brand: "New Balance",
    size: ["7.5", "8", "8.5", "9", "9.5", "10", "10.5"],
    color: "Gris/Naranja",
    sku: "NB-FFX-GO"
  },
  // Casual Sneakers
  {
    name: "Converse Chuck Taylor All Star",
    description: "Clásico atemporal de lona",
    price: 1299,
    stock: 120,
    category: "Casual",
    image: "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=500&q=80",
    brand: "Converse",
    size: ["6", "7", "8", "9", "10", "11", "12"],
    color: "Negro",
    sku: "CV-CTAS-BK"
  },
  {
    name: "Vans Old Skool",
    description: "Estilo skate clásico con sidestripe",
    price: 1499,
    stock: 85,
    category: "Casual",
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&q=80",
    brand: "Vans",
    size: ["7", "8", "8.5", "9", "9.5", "10", "11"],
    color: "Negro/Blanco",
    sku: "VN-OS-BW"
  },
  {
    name: "Puma Suede Classic",
    description: "Icono de los años 80 en gamuza",
    price: 1799,
    stock: 60,
    category: "Casual",
    image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&q=80",
    brand: "Puma",
    size: ["7", "8", "9", "10", "11", "12"],
    color: "Azul Marino",
    sku: "PM-SC-NB"
  },
  // Formal Shoes
  {
    name: "Clarks Desert Boot",
    description: "Bota casual de gamuza con suela de crepe",
    price: 2499,
    stock: 35,
    category: "Formal",
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80",
    brand: "Clarks",
    size: ["7", "8", "9", "10", "11"],
    color: "Beige",
    sku: "CL-DB-BE"
  },
  {
    name: "Timberland Premium 6\"",
    description: "Bota icónica impermeable",
    price: 3999,
    stock: 42,
    category: "Formal",
    image: "https://images.unsplash.com/photo-1549439608-8b685e21781e?w=500&q=80",
    brand: "Timberland",
    size: ["7", "8", "9", "10", "11", "12"],
    color: "Trigo",
    sku: "TB-6IN-WH"
  },
  // Sports Performance
  {
    name: "Jordan 1 Mid",
    description: "Estilo legendario en la cancha y la calle",
    price: 3299,
    stock: 25,
    category: "Basketball",
    image: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=500&q=80",
    brand: "Jordan",
    size: ["8", "8.5", "9", "9.5", "10", "11"],
    color: "Rojo/Negro/Blanco",
    sku: "JR-1MID-RBW"
  },
  {
    name: "Nike Air Force 1 '07",
    description: "El clásico del baloncesto reborn",
    price: 2399,
    stock: 55,
    category: "Basketball",
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80",
    brand: "Nike",
    size: ["7", "8", "8.5", "9", "9.5", "10", "11", "12"],
    color: "Blanco",
    sku: "NK-AF1-WT"
  },
  // Women's Collection
  {
    name: "Steve Madden Irenee Sandal",
    description: "Sandalia de tacón bloque elegante",
    price: 1899,
    stock: 40,
    category: "Women",
    image: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=500&q=80",
    brand: "Steve Madden",
    size: ["5", "6", "7", "8", "9", "10"],
    color: "Negro",
    sku: "SM-IR-BK"
  },
  {
    name: "Nike Air Max 270",
    description: "Estilo moderno con unidad Air visible",
    price: 2799,
    stock: 38,
    category: "Women",
    image: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500&q=80",
    brand: "Nike",
    size: ["5", "6", "7", "8", "9", "10"],
    color: "Rosa/Blanco",
    sku: "NK-AM270-PW"
  },
  // Kids
  {
    name: "Adidas Superstar Kids",
    description: "El clásico shell-toe para niños",
    price: 999,
    stock: 75,
    category: "Kids",
    image: "https://images.unsplash.com/photo-1514989940723-e4d43f46a127?w=500&q=80",
    brand: "Adidas",
    size: ["11K", "12K", "13K", "1", "2", "3"],
    color: "Blanco/Negro",
    sku: "AD-SS-KD"
  },
  {
    name: "Nike Revolution 6 Kids",
    description: "Ligero y cómodo para jugar todo el día",
    price: 899,
    stock: 90,
    category: "Kids",
    image: "https://images.unsplash.com/photo-1562183241-b937e95585b6?w=500&q=80",
    brand: "Nike",
    size: ["11K", "12K", "13K", "1", "2", "3"],
    color: "Azul/Verde",
    sku: "NK-REV6-BG"
  },
  // Soccer/Football
  {
    name: "Adidas Predator Edge",
    description: "Control total del balón",
    price: 3499,
    stock: 30,
    category: "Soccer",
    image: "https://images.unsplash.com/photo-1612387047759-866029f7592f?w=500&q=80",
    brand: "Adidas",
    size: ["7", "8", "8.5", "9", "9.5", "10", "11"],
    color: "Negro/Rosa",
    sku: "AD-PE-BP"
  },
  {
    name: "Nike Mercurial Vapor 15",
    description: "Velocidad explosiva en la cancha",
    price: 3699,
    stock: 22,
    category: "Soccer",
    image: "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=500&q=80",
    brand: "Nike",
    size: ["7", "8", "9", "10", "11"],
    color: "Naranja/Amarillo",
    sku: "NK-MV15-OY"
  }
];

async function seedShoes() {
  console.log('🥾 Iniciando carga de inventario de zapatos...');
  
  try {
    const productsRef = collection(db, 'products');
    
    for (const shoe of shoeProducts) {
      const docRef = await addDoc(productsRef, {
        ...shoe,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true
      });
      console.log(`✅ ${shoe.name} (SKU: ${shoe.sku}) - ID: ${docRef.id}`);
    }
    
    console.log(`\n🎉 ${shoeProducts.length} productos cargados exitosamente`);
    console.log('\n📊 Resumen por categoría:');
    const byCategory = shoeProducts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} productos`);
    });
    
  } catch (error) {
    console.error('❌ Error al cargar inventario:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedShoes();
}

export { shoeProducts, seedShoes };
