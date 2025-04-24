import { ProductsTable } from "@/components/products/ProductsTable";

const ProductsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground">Manage your product catalog</p>
      </div>
      
      <ProductsTable />
    </div>
  );
};

export default ProductsPage;
