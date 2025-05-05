import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import PrintableProductView from '@/components/product/PrintableProductView';
import { Product } from '@/types/product';
import { getProductById } from '@/lib/services/productService';

interface PrintableProductPageProps {
  product: Product;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params || {};
  
  if (!id || typeof id !== 'string') {
    return {
      notFound: true,
    };
  }

  try {
    const product = await getProductById(id);
    
    if (!product) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        product,
      },
    };
  } catch (error) {
    console.error('Error fetching product for printable view:', error);
    return {
      notFound: true,
    };
  }
};

const PrintableProductPage: React.FC<PrintableProductPageProps> = ({ product }) => {
  return (
    <>
      <Head>
        <title>Product Specification: {product.name} ({product.sku})</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="print-container">
        <PrintableProductView product={product} />
      </div>
    </>
  );
};

export default PrintableProductPage; 