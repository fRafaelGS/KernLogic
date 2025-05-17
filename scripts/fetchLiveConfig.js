/**
 * Script to fetch configuration data from the KernLogic API and save it to fixtures
 * 
 * Usage: node scripts/fetchLiveConfig.js
 * 
 * Environment variables:
 * - PRODUCTS_API_BASE_URL: Base URL for the Products API
 * - SERVICE_JWT_TOKEN: JWT token for service-to-service authentication
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FIXTURES_DIR = path.join(__dirname, '../fixtures');

// Ensure fixtures directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

/**
 * Save data to a JSON file
 * @param {string} filename Name of the file
 * @param {any} data Data to save
 */
function saveToFile(filename, data) {
  const filePath = path.join(FIXTURES_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Data saved to ${filePath}`);
}

/**
 * Main function
 */
async function main() {
  console.log("Starting the script...");

  const API_BASE_URL = process.env.PRODUCTS_API_BASE_URL || '/api';
  const JWT_TOKEN = process.env.SERVICE_JWT_TOKEN;

  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`JWT Token available: ${Boolean(JWT_TOKEN)}`);

  if (!JWT_TOKEN) {
    console.warn('Warning: SERVICE_JWT_TOKEN is not set. API calls may fail if authentication is required.');
  }

  try {
    // Create a direct Axios instance for testing
    const axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: JWT_TOKEN ? { Authorization: `Bearer ${JWT_TOKEN}` } : {}
    });

    // Test connection
    console.log("Testing API connection...");
    try {
      const testResponse = await axiosInstance.get('/products/', { params: { limit: 1 } });
      console.log(`API connection test successful. Status: ${testResponse.status}`);
    } catch (error) {
      console.error(`API connection test failed: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      }
    }

    // For now, let's create sample fixtures
    console.log("Creating sample fixtures...");

    // Sample families
    const sampleFamilies = [
      { id: 1, name: "Electronics", products: [{ id: 1, name: "Sample Product" }] },
      { id: 2, name: "Clothing", products: [] }
    ];
    saveToFile('families.json', sampleFamilies);

    // Sample attribute groups
    const sampleAttributeGroups = [
      { id: 1, name: "Technical Specs", items: [] },
      { id: 2, name: "Marketing Info", items: [] }
    ];
    saveToFile('attribute-groups.json', sampleAttributeGroups);

    // Sample attributes
    const sampleAttributes = [
      { id: 1, code: "color", label: "Color", data_type: "string", values: [] },
      { id: 2, code: "size", label: "Size", data_type: "string", values: [] }
    ];
    saveToFile('attributes.json', sampleAttributes);

    console.log("Sample fixtures created successfully!");

  } catch (error) {
    console.error('Error in script execution:', error);
  }
}

// Run the main function
main(); 