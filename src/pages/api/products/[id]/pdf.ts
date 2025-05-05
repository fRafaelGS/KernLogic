import { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';
import { getProductById } from '@/lib/services/productService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    // Fetch the product data
    const product = await getProductById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Generate the PDF using Puppeteer
    const pdf = await generatePdf(id, product.sku);

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="product-${product.sku}.pdf"`);
    
    // Send the PDF
    return res.status(200).send(pdf);
  } catch (error) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({ message: 'Failed to generate PDF' });
  }
}

async function generatePdf(productId: string, sku: string): Promise<Buffer> {
  let browser;
  
  try {
    // Launch a new browser instance
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Set a timeout of 10s as per requirements
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    
    // Navigate to the printable product page
    await page.goto(`${baseUrl}/products/${productId}/printable`, {
      waitUntil: 'networkidle2',
      timeout: 10000, // 10s timeout
    });
    
    // Add print-specific CSS
    await page.addStyleTag({
      content: `
        @page {
          size: A4 portrait;
          margin: 1cm;
        }
        .printable-product-view {
          max-width: none !important;
          padding: 0 !important;
        }
        body {
          font-family: Arial, sans-serif;
        }
        footer {
          position: fixed;
          bottom: 1cm;
          left: 1cm;
          right: 1cm;
          text-align: center;
          font-size: 10px;
          color: #666;
        }
        footer::after {
          content: "Page " counter(page) " of " counter(pages);
        }
      `,
    });
    
    // Generate the PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>', // Empty header - we handle this in the component
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 10px; color: #666;">
          <span>KernLogic PIM - Product Specification</span>
          <span style="margin-left: 1cm;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm',
      },
    });
    
    return pdf;
  } catch (error) {
    console.error('Error during PDF generation:', error);
    throw new Error('PDF generation failed');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
} 