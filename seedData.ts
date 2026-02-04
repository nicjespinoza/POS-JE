import { db, doc, setDoc } from './services/firebase';
import { Product, Role, UserProfile, Branch } from './types';

// Brands: Puma, Adidas, Nike, Land Rover
// Prices: 20, 40, 60, 80, 100, 120

export const SEED_PRODUCTS: Product[] = [
    // Nike
    { id: 'nike-air-max-90', name: 'Nike Air Max 90', price: 120, category: 'Deportivo', stock: 50, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80', description: 'Iconic Design', currentStock: 20 },
    { id: 'nike-dunk-low', name: 'Nike Dunk Low Panda', price: 100, category: 'Casual', stock: 40, image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80', currentStock: 15 },

    // Adidas
    { id: 'adidas-ultraboost', name: 'Adidas Ultraboost', price: 120, category: 'Running', stock: 30, image: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aef4?w=500&q=80', currentStock: 10 },
    { id: 'adidas-superstar', name: 'Adidas Superstar', price: 80, category: 'Casual', stock: 60, image: 'https://images.unsplash.com/photo-1518002171953-a080ee322801?w=500&q=80', currentStock: 25 },

    // Puma
    { id: 'puma-rs-x', name: 'Puma RS-X', price: 100, category: 'Deportivo', stock: 25, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80', currentStock: 8 },
    { id: 'puma-suede', name: 'Puma Suede Classic', price: 60, category: 'Casual', stock: 50, image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80', currentStock: 12 },

    // Land Rover (Assuming Boots/Robust)
    { id: 'landrover-boots', name: 'Land Rover Adventure Boots', price: 120, category: 'Botas', stock: 15, image: 'https://images.unsplash.com/photo-1520639888713-78db64335bc7?w=500&q=80', currentStock: 5 },

    // Generic / Varied
    { id: 'sport-runner-v1', name: 'Sport Runner V1', price: 40, category: 'Running', stock: 100, image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80', currentStock: 30 },
    { id: 'casual-lo-20', name: 'Casual Low Cost', price: 20, category: 'Casual', stock: 200, image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&q=80', currentStock: 50 },
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
