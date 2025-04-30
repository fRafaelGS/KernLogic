import { ProductsTable } from "@/components/products/ProductsTable";

const ProductsPage = () => {
  return (
    <div className="space-y-2">
      <div className="mb-1">
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-muted-foreground text-sm">Manage your product catalog</p>
      </div>
      
      <ProductsTable />
    </div>
  );
};

export default ProductsPage;
