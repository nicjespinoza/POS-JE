import { getProductById } from '../../../services/productService';
import { notFound } from 'next/navigation';
import { ProductDetailsClient } from '../../components/ProductDetailsClient';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
        notFound();
    }

    return <ProductDetailsClient product={product} />;
}
