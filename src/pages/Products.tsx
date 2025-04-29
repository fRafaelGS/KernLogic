import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Product, productService } from '@/services/productService';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export const Products: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const fetchProducts = async () => {
        try {
            console.log('Fetching products...');
            // Use fetchAll=true to get all products across all pages
            const data = await productService.getProducts({}, true);
            console.log('Products fetched:', data.length);
            setProducts(data);
        } catch (error) {
            toast.error('Failed to fetch products');
            console.error('Error fetching products:', error);
        }
    };

    useEffect(() => {
        // Fetch products when component mounts or location changes
        fetchProducts();
    }, [location.pathname]);

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        
        try {
            await productService.deleteProduct(id);
            toast.success('Product deleted successfully');
            fetchProducts(); // Refresh the list
        } catch (error) {
            toast.error('Failed to delete product');
            console.error('Error deleting product:', error);
        }
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
                    <Button onClick={() => navigate('/app/products/new')}>
                        Add New Product
                    </Button>
                </div>

                <Card className="mb-6">
                    <div className="p-4">
                        <Input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-md"
                        />
                    </div>
                </Card>

                <Card>
                    <div className="overflow-x-auto">
                        <Table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>SKU</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((product) => (
                                        <tr 
                                            key={product.id} 
                                            className="cursor-pointer hover:bg-slate-50"
                                            onClick={(e) => {
                                                // Only navigate if not clicking on action buttons
                                                const target = e.target as HTMLElement;
                                                const isButtonClick = !!target.closest('button');
                                                if (!isButtonClick && product.id) {
                                                    navigate(`/app/products/${product.id}`);
                                                }
                                            }}
                                        >
                                            <td>{product.name}</td>
                                            <td>{product.sku}</td>
                                            <td>{product.category}</td>
                                            <td>${product.price.toFixed(2)}</td>
                                            <td>
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {product.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/app/products/${product.id}/edit`);
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            product.id && handleDelete(product.id);
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4">
                                            No products found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}; 