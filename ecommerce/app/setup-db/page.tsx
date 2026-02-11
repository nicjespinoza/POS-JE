'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, doc, setDoc } from '../../lib/firebase';
import { Product } from '../../lib/types';

const BRANCHES = [
    { id: 'suc-1', name: 'Sucursal Centro' },
    { id: 'suc-2', name: 'Sucursal Norte' },
    { id: 'suc-3', name: 'Sucursal Sur' },
];

const SEED_PRODUCTS: Product[] = [
    {
        id: 'nike-air-max-90', name: 'Nike Air Max 90', price: 2899, cost: 1450, category: 'Deportivo', stock: 50,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
            'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80',
            'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Amortiguacion Air visible', brand: 'Nike',
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
        description: 'Estilo urbano clasico', brand: 'Nike',
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
        description: 'El clasico que nunca pasa de moda', brand: 'Nike',
        size: ['6', '7', '8', '9', '10', '11', '12'], color: 'Blanco', sku: 'NK-AF1-WH', discount: 0
    },
    {
        id: 'adidas-ultraboost', name: 'Adidas Ultraboost 23', price: 3299, cost: 1650, category: 'Running', stock: 30,
        image: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aef4?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1587563871167-1ee9c731aef4?w=500&q=80',
            'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=500&q=80',
            'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Maxima amortiguacion Boost', brand: 'Adidas',
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
        description: 'Icono de las tres franjas', brand: 'Adidas',
        size: ['6', '7', '8', '9', '10', '11'], color: 'Blanco/Negro', sku: 'AD-SS-WB', discount: 0
    },
    {
        id: 'adidas-predator', name: 'Adidas Predator Edge', price: 3499, cost: 1750, category: 'Soccer', stock: 25,
        image: 'https://images.unsplash.com/photo-1612387047759-866029f7592f?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1612387047759-866029f7592f?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Control total del balon', brand: 'Adidas',
        size: ['7', '8', '8.5', '9', '9.5', '10', '11'], color: 'Negro/Rosa', sku: 'AD-PE-BP', discount: 0
    },
    {
        id: 'puma-rs-x', name: 'Puma RS-X Reinvention', price: 2199, cost: 1050, category: 'Deportivo', stock: 25,
        image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80',
            'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Running System reinventada', brand: 'Puma',
        size: ['7', '8', '9', '10', '11'], color: 'Multicolor', sku: 'PM-RSX-MC', discount: 20
    },
    {
        id: 'puma-suede', name: 'Puma Suede Classic', price: 1599, cost: 750, category: 'Casual', stock: 50,
        image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Clasico de gamuza desde 1968', brand: 'Puma',
        size: ['6', '7', '8', '9', '10'], color: 'Azul/Blanco', sku: 'PM-SC-BW', discount: 0
    },
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
    {
        id: 'landrover-boots', name: 'Land Rover Adventure Boots', price: 3199, cost: 1600, category: 'Botas', stock: 15,
        image: 'https://images.unsplash.com/photo-1520639888713-78db64335bc7?w=500&q=80',
        images: [
            'https://images.unsplash.com/photo-1520639888713-78db64335bc7?w=500&q=80',
            'https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=500&q=80',
        ],
        mainImageIndex: 0,
        description: 'Botas todo terreno', brand: 'Land Rover',
        size: ['8', '9', '10', '11', '12'], color: 'Cafe', sku: 'LR-AB-BR', discount: 0
    },
    {
        id: 'nike-slides', name: 'Nike Benassi Slides', price: 799, cost: 350, category: 'Sandalias', stock: 80,
        image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Comodidad post-entrenamiento', brand: 'Nike',
        size: ['7', '8', '9', '10', '11'], color: 'Negro', sku: 'NK-BN-BK', discount: 0
    },
    {
        id: 'nike-mercurial', name: 'Nike Mercurial Vapor 15', price: 3699, cost: 1850, category: 'Soccer', stock: 22,
        image: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1511886929837-354d827aae26?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Velocidad explosiva', brand: 'Nike',
        size: ['7', '8', '9', '10', '11'], color: 'Naranja/Amarillo', sku: 'NK-MV15-OY', discount: 0
    },
    // ===== 30 NUEVOS PRODUCTOS =====
    {
        id: 'nike-jordan-1-high', name: 'Air Jordan 1 Retro High OG', price: 3899, cost: 1950, category: 'Casual', stock: 30,
        image: 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=500&q=80'],
        mainImageIndex: 0,
        description: 'El icono del streetwear desde 1985', brand: 'Nike',
        size: ['7', '8', '9', '10', '11', '12'], color: 'Rojo/Negro/Blanco', sku: 'NK-AJ1-RBW', discount: 0
    },
    {
        id: 'nike-air-max-270', name: 'Nike Air Max 270', price: 2799, cost: 1400, category: 'Deportivo', stock: 35,
        image: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Camara Air de 270 grados para comodidad todo el dia', brand: 'Nike',
        size: ['7', '8', '9', '10', '11'], color: 'Negro/Blanco', sku: 'NK-AM270-BW', discount: 10
    },
    {
        id: 'nike-react-infinity', name: 'Nike React Infinity Run 4', price: 3199, cost: 1600, category: 'Running', stock: 20,
        image: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Disenado para reducir lesiones al correr', brand: 'Nike',
        size: ['7', '8', '9', '10', '11'], color: 'Azul/Blanco', sku: 'NK-RI4-BW', discount: 0
    },
    {
        id: 'nike-blazer-mid', name: 'Nike Blazer Mid 77', price: 2199, cost: 1050, category: 'Casual', stock: 40,
        image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Estilo retro de basquetbol', brand: 'Nike',
        size: ['6', '7', '8', '9', '10', '11'], color: 'Blanco/Negro', sku: 'NK-BZ77-WB', discount: 5
    },
    {
        id: 'adidas-gazelle', name: 'Adidas Gazelle', price: 1899, cost: 900, category: 'Casual', stock: 45,
        image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1556906781-9a412961c28c?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Clasico de gamuza con tres franjas', brand: 'Adidas',
        size: ['6', '7', '8', '9', '10', '11'], color: 'Verde/Blanco', sku: 'AD-GZ-GW', discount: 0
    },
    {
        id: 'adidas-stan-smith', name: 'Adidas Stan Smith', price: 1999, cost: 950, category: 'Casual', stock: 55,
        image: 'https://images.unsplash.com/photo-1518002171953-a080ee322801?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1518002171953-a080ee322801?w=500&q=80'],
        mainImageIndex: 0,
        description: 'El tenis blanco mas famoso del mundo', brand: 'Adidas',
        size: ['6', '7', '8', '9', '10', '11', '12'], color: 'Blanco/Verde', sku: 'AD-SM-WG', discount: 0
    },
    {
        id: 'adidas-nmd-r1', name: 'Adidas NMD R1', price: 2899, cost: 1450, category: 'Deportivo', stock: 25,
        image: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aef4?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1587563871167-1ee9c731aef4?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Fusion de running heritage y tecnologia Boost', brand: 'Adidas',
        size: ['7', '8', '9', '10', '11'], color: 'Negro/Rojo', sku: 'AD-NMD-BR', discount: 15
    },
    {
        id: 'adidas-forum-low', name: 'Adidas Forum Low', price: 2199, cost: 1050, category: 'Casual', stock: 30,
        image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Herencia del basquetbol de los 80s', brand: 'Adidas',
        size: ['7', '8', '9', '10', '11'], color: 'Blanco/Azul', sku: 'AD-FL-WBL', discount: 0
    },
    {
        id: 'adidas-copa-mundial', name: 'Adidas Copa Mundial', price: 3299, cost: 1650, category: 'Soccer', stock: 18,
        image: 'https://images.unsplash.com/photo-1612387047759-866029f7592f?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1612387047759-866029f7592f?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Taco de piel clasico profesional', brand: 'Adidas',
        size: ['7', '8', '9', '10', '11'], color: 'Negro/Blanco', sku: 'AD-CM-BW', discount: 0
    },
    {
        id: 'puma-carina', name: 'Puma Carina 2.0', price: 1499, cost: 700, category: 'Casual', stock: 50,
        image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Plataforma elegante para uso diario', brand: 'Puma',
        size: ['5', '6', '7', '8', '9'], color: 'Blanco/Rosa', sku: 'PM-C2-WP', discount: 10
    },
    {
        id: 'puma-future-rider', name: 'Puma Future Rider Play On', price: 1899, cost: 900, category: 'Deportivo', stock: 30,
        image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Estilo retro-running vibrante', brand: 'Puma',
        size: ['7', '8', '9', '10', '11'], color: 'Multicolor', sku: 'PM-FR-MC', discount: 0
    },
    {
        id: 'puma-mb01', name: 'Puma MB.01 LaMelo Ball', price: 2899, cost: 1400, category: 'Basketball', stock: 15,
        image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Signature shoe de LaMelo Ball', brand: 'Puma',
        size: ['8', '9', '10', '11', '12', '13'], color: 'Azul/Dorado', sku: 'PM-MB01-BG', discount: 0
    },
    {
        id: 'nb-990v6', name: 'New Balance 990v6', price: 3999, cost: 2000, category: 'Running', stock: 18,
        image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Made in USA - Premium running heritage', brand: 'New Balance',
        size: ['7', '8', '9', '10', '11', '12'], color: 'Gris', sku: 'NB-990V6-GR', discount: 0
    },
    {
        id: 'nb-550', name: 'New Balance 550', price: 2299, cost: 1100, category: 'Casual', stock: 35,
        image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Basquetbol retro de los 80s', brand: 'New Balance',
        size: ['6', '7', '8', '9', '10', '11'], color: 'Blanco/Verde', sku: 'NB-550-WG', discount: 5
    },
    {
        id: 'nb-2002r', name: 'New Balance 2002R', price: 2799, cost: 1400, category: 'Running', stock: 22,
        image: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Amortiguacion N-ERGY premium', brand: 'New Balance',
        size: ['7', '8', '9', '10', '11'], color: 'Rain Cloud', sku: 'NB-2002R-RC', discount: 0
    },
    {
        id: 'converse-chuck-70', name: 'Converse Chuck 70 High', price: 1699, cost: 800, category: 'Casual', stock: 60,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80'],
        mainImageIndex: 0,
        description: 'El All Star premium con lona superior', brand: 'Converse',
        size: ['5', '6', '7', '8', '9', '10', '11', '12'], color: 'Negro', sku: 'CV-C70H-BK', discount: 0
    },
    {
        id: 'converse-one-star', name: 'Converse One Star Pro', price: 1499, cost: 700, category: 'Casual', stock: 40,
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Gamuza premium para skate', brand: 'Converse',
        size: ['6', '7', '8', '9', '10', '11'], color: 'Azul Marino', sku: 'CV-OS-NV', discount: 10
    },
    {
        id: 'vans-old-skool', name: 'Vans Old Skool', price: 1399, cost: 650, category: 'Casual', stock: 70,
        image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Clasico del skate con franja lateral', brand: 'Vans',
        size: ['5', '6', '7', '8', '9', '10', '11', '12'], color: 'Negro/Blanco', sku: 'VN-OS-BW', discount: 0
    },
    {
        id: 'vans-sk8-hi', name: 'Vans Sk8-Hi', price: 1599, cost: 750, category: 'Casual', stock: 45,
        image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Bota alta de lona y gamuza', brand: 'Vans',
        size: ['6', '7', '8', '9', '10', '11'], color: 'Negro/Blanco', sku: 'VN-S8H-BW', discount: 5
    },
    {
        id: 'vans-authentic', name: 'Vans Authentic', price: 1199, cost: 550, category: 'Casual', stock: 55,
        image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&q=80'],
        mainImageIndex: 0,
        description: 'El original de Vans desde 1966', brand: 'Vans',
        size: ['5', '6', '7', '8', '9', '10', '11'], color: 'Rojo', sku: 'VN-AU-RD', discount: 0
    },
    {
        id: 'reebok-classic', name: 'Reebok Classic Leather', price: 1799, cost: 850, category: 'Casual', stock: 35,
        image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Piel suave con suela de goma clasica', brand: 'Reebok',
        size: ['7', '8', '9', '10', '11'], color: 'Blanco', sku: 'RB-CL-WH', discount: 0
    },
    {
        id: 'reebok-nano-x4', name: 'Reebok Nano X4', price: 2699, cost: 1350, category: 'Training', stock: 20,
        image: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80'],
        mainImageIndex: 0,
        description: 'El #1 para CrossFit y training funcional', brand: 'Reebok',
        size: ['7', '8', '9', '10', '11', '12'], color: 'Negro/Rojo', sku: 'RB-NX4-BR', discount: 0
    },
    {
        id: 'asics-gel-kayano', name: 'ASICS Gel-Kayano 30', price: 3499, cost: 1750, category: 'Running', stock: 16,
        image: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aef4?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1587563871167-1ee9c731aef4?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Estabilidad y amortiguacion GEL premium', brand: 'ASICS',
        size: ['7', '8', '9', '10', '11'], color: 'Azul/Blanco', sku: 'AS-GK30-BW', discount: 0
    },
    {
        id: 'asics-gel-nimbus', name: 'ASICS Gel-Nimbus 25', price: 3299, cost: 1650, category: 'Running', stock: 18,
        image: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Maxima amortiguacion para largas distancias', brand: 'ASICS',
        size: ['7', '8', '9', '10', '11'], color: 'Negro/Lima', sku: 'AS-GN25-BL', discount: 10
    },
    {
        id: 'skechers-go-walk', name: 'Skechers Go Walk 7', price: 1599, cost: 750, category: 'Casual', stock: 50,
        image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Ultra ligero con Arch Fit', brand: 'Skechers',
        size: ['6', '7', '8', '9', '10', '11'], color: 'Negro', sku: 'SK-GW7-BK', discount: 0
    },
    {
        id: 'skechers-dlites', name: 'Skechers D\'Lites', price: 1799, cost: 850, category: 'Casual', stock: 40,
        image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Chunky sneaker con Memory Foam', brand: 'Skechers',
        size: ['5', '6', '7', '8', '9', '10'], color: 'Blanco/Azul', sku: 'SK-DL-WBL', discount: 15
    },
    {
        id: 'timberland-6inch', name: 'Timberland 6-Inch Premium', price: 4299, cost: 2150, category: 'Botas', stock: 15,
        image: 'https://images.unsplash.com/photo-1520639888713-78db64335bc7?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1520639888713-78db64335bc7?w=500&q=80'],
        mainImageIndex: 0,
        description: 'La bota amarilla iconinca waterproof', brand: 'Timberland',
        size: ['7', '8', '9', '10', '11', '12'], color: 'Wheat', sku: 'TB-6IN-WH', discount: 0
    },
    {
        id: 'dr-martens-1460', name: 'Dr. Martens 1460', price: 3899, cost: 1950, category: 'Botas', stock: 18,
        image: 'https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Las 8 ojeras originales con suela AirWair', brand: 'Dr. Martens',
        size: ['6', '7', '8', '9', '10', '11', '12'], color: 'Negro', sku: 'DM-1460-BK', discount: 0
    },
    {
        id: 'crocs-classic-clog', name: 'Crocs Classic Clog', price: 999, cost: 450, category: 'Sandalias', stock: 80,
        image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Comodidad Croslite ultra-liviana', brand: 'Crocs',
        size: ['5', '6', '7', '8', '9', '10', '11', '12'], color: 'Verde', sku: 'CR-CC-GR', discount: 0
    },
    {
        id: 'birkenstock-arizona', name: 'Birkenstock Arizona', price: 2199, cost: 1050, category: 'Sandalias', stock: 25,
        image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&q=80'],
        mainImageIndex: 0,
        description: 'Plantilla de corcho anatomica', brand: 'Birkenstock',
        size: ['6', '7', '8', '9', '10', '11'], color: 'Marron', sku: 'BK-AZ-BRN', discount: 0
    },
];

// Stock distribution per branch (randomized but realistic)
const STOCK_DISTRIBUTION: Record<string, number[]> = {
    'nike-air-max-90': [20, 15, 15],
    'nike-dunk-low': [15, 12, 13],
    'nike-air-force-1': [25, 18, 17],
    'adidas-ultraboost': [12, 10, 8],
    'adidas-superstar': [25, 20, 15],
    'adidas-predator': [10, 8, 7],
    'puma-rs-x': [10, 8, 7],
    'puma-suede': [20, 15, 15],
    'nb-574': [15, 10, 10],
    'landrover-boots': [6, 5, 4],
    'nike-slides': [30, 25, 25],
    'nike-mercurial': [8, 7, 7],
    // 30 nuevos productos
    'nike-jordan-1-high': [12, 10, 8],
    'nike-air-max-270': [14, 11, 10],
    'nike-react-infinity': [8, 6, 6],
    'nike-blazer-mid': [16, 12, 12],
    'adidas-gazelle': [18, 14, 13],
    'adidas-stan-smith': [22, 17, 16],
    'adidas-nmd-r1': [10, 8, 7],
    'adidas-forum-low': [12, 10, 8],
    'adidas-copa-mundial': [7, 6, 5],
    'puma-carina': [20, 15, 15],
    'puma-future-rider': [12, 10, 8],
    'puma-mb01': [6, 5, 4],
    'nb-990v6': [7, 6, 5],
    'nb-550': [14, 11, 10],
    'nb-2002r': [9, 7, 6],
    'converse-chuck-70': [24, 18, 18],
    'converse-one-star': [16, 12, 12],
    'vans-old-skool': [28, 22, 20],
    'vans-sk8-hi': [18, 14, 13],
    'vans-authentic': [22, 17, 16],
    'reebok-classic': [14, 11, 10],
    'reebok-nano-x4': [8, 6, 6],
    'asics-gel-kayano': [6, 5, 5],
    'asics-gel-nimbus': [7, 6, 5],
    'skechers-go-walk': [20, 15, 15],
    'skechers-dlites': [16, 12, 12],
    'timberland-6inch': [6, 5, 4],
    'dr-martens-1460': [7, 6, 5],
    'crocs-classic-clog': [30, 25, 25],
    'birkenstock-arizona': [10, 8, 7],
};

export default function SetupDbPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const log = (msg: string) => setStatus(s => s + '\n' + msg);

    const initializeDB = async () => {
        if (!user) { setStatus('Debes iniciar sesion primero.'); return; }
        if (user.email !== 'admin@webdesignje.com') {
            setStatus('ERROR: Solo admin@webdesignje.com puede inicializar la base de datos.');
            return;
        }
        setLoading(true);
        setStatus('Iniciando configuracion...');

        try {
            // 1. Access Users
            const users = [
                { email: 'admin@webdesignje.com', role: 'ADMIN', branchId: null },
                { email: 'suc1@webdesignje.com', role: 'SUC1', branchId: 'suc-1' },
                { email: 'suc2@webdesignje.com', role: 'SUC2', branchId: 'suc-2' },
                { email: 'suc3@webdesignje.com', role: 'SUC3', branchId: 'suc-3' },
            ];
            for (const u of users) {
                await setDoc(doc(db, 'access_users', u.email), {
                    email: u.email, role: u.role, branchId: u.branchId,
                    authorized: true, createdAt: new Date().toISOString()
                });
            }
            log('Usuarios de acceso creados (4)');

            // 2. Branches
            for (const b of BRANCHES) {
                await setDoc(doc(db, 'branches', b.id), {
                    id: b.id, name: b.name, isActive: true,
                    createdAt: new Date().toISOString()
                });
            }
            log('Sucursales creadas (3)');

            // 3. Products + Inventory + Initial Batches
            for (const product of SEED_PRODUCTS) {
                // Save product
                await setDoc(doc(db, 'products', product.id), {
                    ...product,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

                // Create inventory per branch + initial batch
                const stocks = STOCK_DISTRIBUTION[product.id] || [10, 10, 10];
                for (let i = 0; i < BRANCHES.length; i++) {
                    const branch = BRANCHES[i];
                    const branchStock = stocks[i];
                    const inventoryId = `${product.id}_${branch.id}`;

                    // Inventory aggregate
                    await setDoc(doc(db, 'inventory', inventoryId), {
                        productId: product.id,
                        branchId: branch.id,
                        stock: branchStock,
                        lowStockThreshold: 5,
                        updatedAt: new Date().toISOString()
                    });

                    // Initial batch (FIFO)
                    const batchId = `batch_${product.id}_${branch.id}_initial`;
                    await setDoc(doc(db, 'inventory_batches', batchId), {
                        id: batchId,
                        productId: product.id,
                        branchId: branch.id,
                        cost: product.cost || product.price * 0.5,
                        initialStock: branchStock,
                        remainingStock: branchStock,
                        createdAt: new Date().toISOString(),
                        receivedBy: 'system-seed'
                    });

                    // Initial movement (ENTRADA)
                    const movId = `mov_${product.id}_${branch.id}_initial`;
                    await setDoc(doc(db, 'inventory_movements', movId), {
                        id: movId,
                        productId: product.id,
                        productName: product.name,
                        branchId: branch.id,
                        branchName: branch.name,
                        type: 'ENTRADA',
                        quantity: branchStock,
                        previousStock: 0,
                        newStock: branchStock,
                        reason: 'Inventario inicial - Seed',
                        userId: 'system-seed',
                        userName: 'Sistema',
                        createdAt: new Date().toISOString()
                    });
                }
                log(`Producto: ${product.name} + inventario en 3 sucursales`);
            }

            // 4. Admin profile sync
            if (user.email === 'admin@webdesignje.com') {
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid, email: user.email,
                    displayName: user.displayName || 'Admin',
                    role: 'ADMIN', photoURL: user.photoURL
                }, { merge: true });
                log('Perfil admin sincronizado.');
            }

            log('\nEXITO! Base de datos inicializada con:');
            log(`- ${SEED_PRODUCTS.length} productos`);
            log(`- ${BRANCHES.length} sucursales`);
            log(`- ${SEED_PRODUCTS.length * BRANCHES.length} registros de inventario`);
            log(`- ${SEED_PRODUCTS.length * BRANCHES.length} lotes iniciales (FIFO)`);
            log(`- ${SEED_PRODUCTS.length * BRANCHES.length} movimientos de kardex`);

        } catch (error: any) {
            console.error(error);
            log('ERROR: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">Inicializacion de Base de Datos</h1>
                <p className="text-gray-400 mb-6">
                    Crea productos, inventario por sucursal, lotes FIFO y movimientos de kardex iniciales.
                </p>

                <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl mb-6">
                    <p className="text-white"><strong>Usuario:</strong> {user?.email || 'No conectado'}</p>
                    <p className="text-sm text-gray-500 mt-1">Debes ser admin@webdesignje.com</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-purple-900/30 border border-purple-800 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-purple-400">{SEED_PRODUCTS.length}</div>
                        <div className="text-xs text-gray-400">Productos</div>
                    </div>
                    <div className="bg-blue-900/30 border border-blue-800 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-blue-400">{BRANCHES.length}</div>
                        <div className="text-xs text-gray-400">Sucursales</div>
                    </div>
                    <div className="bg-green-900/30 border border-green-800 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-green-400">{SEED_PRODUCTS.length * BRANCHES.length}</div>
                        <div className="text-xs text-gray-400">Registros Inventario</div>
                    </div>
                </div>

                <button
                    onClick={initializeDB}
                    disabled={loading || !user}
                    className="w-full bg-purple-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 text-lg transition-colors"
                >
                    {loading ? 'Procesando...' : 'INICIALIZAR BASE DE DATOS'}
                </button>

                {status && (
                    <pre className="mt-6 p-4 bg-black border border-gray-800 text-green-400 rounded-xl overflow-auto whitespace-pre-wrap text-sm max-h-96">
                        {status}
                    </pre>
                )}
            </div>
        </div>
    );
}
