/**
 * Script para inicializar datos en Firestore
 * Ejecutar una sola vez para configurar usuarios, sucursales y productos
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAWQS6K0KX5v4VcCMkc8wYMcDCy620g5a0",
    authDomain: "pos-zapatos.firebaseapp.com",
    projectId: "pos-zapatos",
    storageBucket: "pos-zapatos.firebasestorage.app",
    messagingSenderId: "717323415083",
    appId: "1:717323415083:web:12e41d5fd205ba2301c46e",
    measurementId: "G-DQTWFD2B83"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Usuarios a configurar (deben existir en Firebase Auth)
const USERS = [
    {
        email: 'admin@webdesignje.com',
        role: 'ADMIN',
        branchId: 'all',
        displayName: 'Super Administrador'
    },
    {
        email: 'suc1@webdesignje.com',
        role: 'MANAGER',
        branchId: 'sucursal-1',
        displayName: 'Admin Sucursal 1'
    },
    {
        email: 'suc2@webdesignje.com',
        role: 'MANAGER',
        branchId: 'sucursal-2',
        displayName: 'Admin Sucursal 2'
    },
    {
        email: 'suc3@webdesignje.com',
        role: 'MANAGER',
        branchId: 'sucursal-3',
        displayName: 'Admin Sucursal 3'
    },
];

// Sucursales
const BRANCHES = [
    { id: 'sucursal-1', name: 'Sucursal 1 - Centro', address: '', phone: '', isActive: true },
    { id: 'sucursal-2', name: 'Sucursal 2 - Norte', address: '', phone: '', isActive: true },
    { id: 'sucursal-3', name: 'Sucursal 3 - Sur', address: '', phone: '', isActive: true },
];

// Productos de zapatos
const PRODUCTS = [
    { id: 'nike-air-max-90', name: 'Nike Air Max 90', price: 120, category: 'Deportivo', stock: 50, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80' },
    { id: 'nike-dunk-low', name: 'Nike Dunk Low Panda', price: 100, category: 'Casual', stock: 40, image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80' },
    { id: 'adidas-ultraboost', name: 'Adidas Ultraboost', price: 120, category: 'Running', stock: 30, image: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aef4?w=500&q=80' },
    { id: 'adidas-superstar', name: 'Adidas Superstar', price: 80, category: 'Casual', stock: 60, image: 'https://images.unsplash.com/photo-1518002171953-a080ee322801?w=500&q=80' },
    { id: 'puma-rs-x', name: 'Puma RS-X', price: 100, category: 'Deportivo', stock: 25, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80' },
    { id: 'puma-suede', name: 'Puma Suede Classic', price: 60, category: 'Casual', stock: 50, image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80' },
    { id: 'landrover-boots', name: 'Land Rover Adventure Boots', price: 120, category: 'Botas', stock: 15, image: 'https://images.unsplash.com/photo-1520639888713-78db64335bc7?w=500&q=80' },
    { id: 'sport-runner-v1', name: 'Sport Runner V1', price: 40, category: 'Running', stock: 100, image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80' },
    { id: 'casual-lo-20', name: 'Casual Low Cost', price: 20, category: 'Casual', stock: 200, image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&q=80' },
];

async function initializeFirestore() {
    console.log('🚀 Iniciando configuración de Firestore...\n');

    try {
        // 1. Crear Sucursales
        console.log('📍 Creando sucursales...');
        for (const branch of BRANCHES) {
            await setDoc(doc(db, 'branches', branch.id), branch);
            console.log(`   ✓ ${branch.name}`);
        }

        // 2. Crear Productos
        console.log('\n📦 Creando productos...');
        for (const product of PRODUCTS) {
            await setDoc(doc(db, 'products', product.id), product);
            console.log(`   ✓ ${product.name}`);
        }

        // 3. Crear Inventario por Sucursal
        console.log('\n📊 Creando inventario por sucursal...');
        for (const branch of BRANCHES) {
            for (const product of PRODUCTS) {
                const inventoryId = `${product.id}_${branch.id}`;
                await setDoc(doc(db, 'inventory', inventoryId), {
                    productId: product.id,
                    branchId: branch.id,
                    stock: Math.floor(product.stock / 3), // Dividir stock entre sucursales
                    lowStockThreshold: 5,
                    updatedAt: new Date().toISOString()
                });
            }
            console.log(`   ✓ Inventario para ${branch.name}`);
        }

        console.log('\n✅ ¡Configuración completada!');
        console.log('\n📋 Ahora necesitas crear los perfiles de usuario.');
        console.log('   Para cada usuario, inicia sesión y el perfil se creará automáticamente.');
        console.log('\n   Usuarios:');
        USERS.forEach(u => console.log(`   - ${u.email} (${u.role})`));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Ejecutar
initializeFirestore();
