import { db, doc, setDoc, collection, getDocs } from './services/firebase';
import { Product, Role, UserProfile, Branch } from './types';

// Brands: Nike, Adidas, Puma, Land Rover, New Balance
// Multi-image support: up to 10 images per product

export const SEED_PRODUCTS: Product[] = [
    // Nike
    {
        id: 'nike-air-max-90', name: 'Nike Air Max 90', price: 2899, cost: 1450, category: 'Deportivo', stock: 50,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
            'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80',
            'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Diseño icónico con amortiguación Air visible', brand: 'Nike',
        size: ['7', '8', '8.5', '9', '9.5', '10', '11'], color: 'Rojo/Blanco', sku: 'NK-AM90-RW', discount: 0
    },
    {
        id: 'nike-dunk-low', name: 'Nike Dunk Low Panda', price: 2499, cost: 1200, category: 'Casual', stock: 40,
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80',
            'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Estilo urbano clásico en blanco y negro', brand: 'Nike',
        size: ['7', '8', '9', '10', '11'], color: 'Blanco/Negro', sku: 'NK-DL-PN', discount: 10
    },
    {
        id: 'nike-air-force-1', name: 'Nike Air Force 1 Low', price: 2299, cost: 1100, category: 'Casual', stock: 60,
        image: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500&q=80',
            'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'El clásico que nunca pasa de moda', brand: 'Nike',
        size: ['6', '7', '8', '9', '10', '11', '12'], color: 'Blanco', sku: 'NK-AF1-WH', discount: 0
    },

    // Adidas
    {
        id: 'adidas-ultraboost', name: 'Adidas Ultraboost 23', price: 3299, cost: 1650, category: 'Running', stock: 30,
        image: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aef4?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1587563871167-1ee9c731aef4?w=500&q=80',
            'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=500&q=80',
            'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Máxima amortiguación Boost para corredores', brand: 'Adidas',
        size: ['7', '8', '8.5', '9', '10', '11'], color: 'Negro/Blanco', sku: 'AD-UB23-BW', discount: 15
    },
    {
        id: 'adidas-superstar', name: 'Adidas Superstar', price: 1999, cost: 950, category: 'Casual', stock: 60,
        image: 'https://images.unsplash.com/photo-1518002171953-a080ee322801?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1518002171953-a080ee322801?w=500&q=80',
            'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'El ícono de las tres franjas con puntera shell toe', brand: 'Adidas',
        size: ['6', '7', '8', '9', '10', '11'], color: 'Blanco/Negro', sku: 'AD-SS-WB', discount: 0
    },
    {
        id: 'adidas-predator', name: 'Adidas Predator Edge', price: 3499, cost: 1750, category: 'Soccer', stock: 25,
        image: 'https://images.unsplash.com/photo-1612387047759-866029f7592f?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1612387047759-866029f7592f?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Control total del balón en la cancha', brand: 'Adidas',
        size: ['7', '8', '8.5', '9', '9.5', '10', '11'], color: 'Negro/Rosa', sku: 'AD-PE-BP', discount: 0
    },

    // Puma
    {
        id: 'puma-rs-x', name: 'Puma RS-X Reinvention', price: 2199, cost: 1050, category: 'Deportivo', stock: 25,
        image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80',
            'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Tecnología Running System reinventada', brand: 'Puma',
        size: ['7', '8', '9', '10', '11'], color: 'Multicolor', sku: 'PM-RSX-MC', discount: 20
    },
    {
        id: 'puma-suede', name: 'Puma Suede Classic', price: 1599, cost: 750, category: 'Casual', stock: 50,
        image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Clásico de gamuza desde 1968', brand: 'Puma',
        size: ['6', '7', '8', '9', '10'], color: 'Azul/Blanco', sku: 'PM-SC-BW', discount: 0
    },

    // New Balance
    {
        id: 'nb-574', name: 'New Balance 574', price: 2099, cost: 1000, category: 'Casual', stock: 35,
        image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80',
            'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Comodidad y estilo retro', brand: 'New Balance',
        size: ['7', '8', '9', '10', '11'], color: 'Gris/Azul', sku: 'NB-574-GB', discount: 5
    },

    // Botas
    {
        id: 'landrover-boots', name: 'Land Rover Adventure Boots', price: 3199, cost: 1600, category: 'Botas', stock: 15,
        image: 'https://images.unsplash.com/photo-1520639888713-78db64335bc7?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1520639888713-78db64335bc7?w=500&q=80',
            'https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Botas todo terreno resistentes al agua', brand: 'Land Rover',
        size: ['8', '9', '10', '11', '12'], color: 'Café', sku: 'LR-AB-BR', discount: 0
    },

    // Sandalias
    {
        id: 'nike-slides', name: 'Nike Benassi Slides', price: 799, cost: 350, category: 'Sandalias', stock: 80,
        image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Comodidad para después del entrenamiento', brand: 'Nike',
        size: ['7', '8', '9', '10', '11'], color: 'Negro', sku: 'NK-BN-BK', discount: 0
    },

    // Soccer
    {
        id: 'nike-mercurial', name: 'Nike Mercurial Vapor 15', price: 3699, cost: 1850, category: 'Soccer', stock: 22,
        image: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Velocidad explosiva en la cancha', brand: 'Nike',
        size: ['7', '8', '9', '10', '11'], color: 'Naranja/Amarillo', sku: 'NK-MV15-OY', discount: 0
    },
];

// Contraseña para todos los usuarios: 123456
export const CLIENT_USERS = [
    { email: 'admin@webdesignje.com', role: Role.ADMIN, branchId: 'all', name: 'Super Administrador', password: '123456' },
    { email: 'suc1@webdesignje.com', role: Role.MANAGER, branchId: 'sucursal-1', name: 'Admin Sucursal 1', password: '123456' },
    { email: 'suc2@webdesignje.com', role: Role.MANAGER, branchId: 'sucursal-2', name: 'Admin Sucursal 2', password: '123456' },
    { email: 'suc3@webdesignje.com', role: Role.MANAGER, branchId: 'sucursal-3', name: 'Admin Sucursal 3', password: '123456' },
];

export const BRANCHES: Branch[] = [
    { id: 'main-office', name: 'Oficina Central', isActive: true },
    { id: 'sucursal-1', name: 'Sucursal Centro', isActive: true },
    { id: 'sucursal-2', name: 'Sucursal Norte', isActive: true },
    { id: 'sucursal-3', name: 'Sucursal Sur', isActive: true },
];
