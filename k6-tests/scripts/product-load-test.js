import { check, sleep, group } from 'k6'
import { Rate, Counter } from 'k6/metrics'
import { KernLogicAPIClient } from '../kernlogic-api.js'

// Custom metrics
const productCreationRate = new Rate('product_creation_success')
const productRetrievalRate = new Rate('product_retrieval_success')

// Product-focused load test configuration
export const options = {
  scenarios: {
    product_operations: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },   // Ramp up to 10 users
        { duration: '3m', target: 10 },   // Maintain 10 users
        { duration: '1m', target: 20 },   // Ramp up to 20 users
        { duration: '2m', target: 20 },   // Maintain 20 users
        { duration: '1m', target: 0 },    // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],        // 95% of requests under 3s
    http_req_failed: ['rate<0.1'],            // Less than 10% failures
    product_creation_success: ['rate>0.8'],   // 80% product creation success
    product_retrieval_success: ['rate>0.95'], // 95% product retrieval success
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'
const TEST_EMAIL = __ENV.TEST_EMAIL || 'test@example.com'
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'testpassword123'

const kernLogicAPIClient = new KernLogicAPIClient({ 
  baseUrl: BASE_URL 
})

// Product categories for realistic testing
const categories = ['Electronics', 'Furniture', 'Books', 'Clothing', 'Sports']
const brands = ['TechCorp', 'ComfortHome', 'BookWorld', 'FashionPlus', 'SportsPro']

// Authentication token (shared across VUs)
let authToken = ''

export function setup() {
  // Authenticate once during setup
  const authResponse = kernLogicAPIClient.tokenCreate({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })
  
  if (authResponse.response.status === 200) {
    const body = JSON.parse(authResponse.response.body)
    return { authToken: body.access }
  }
  
  console.error('Setup failed: Could not authenticate')
  return { authToken: '' }
}

export default function(data) {
  if (!data.authToken) {
    console.error('No auth token available, skipping tests')
    return
  }
  
  // Set auth header for all requests
  kernLogicAPIClient.commonRequestParameters = {
    headers: {
      'Authorization': `Bearer ${data.authToken}`,
      'Content-Type': 'application/json'
    }
  }
  
  const vuId = __VU
  const iterationId = __ITER
  
  group('Product CRUD Operations', () => {
    
    // 1. List products (most common operation)
    group('List Products', () => {
      const listResponse = kernLogicAPIClient.productsV1List()
      
      const success = check(listResponse.response, {
        'list products: status 200': (r) => r.status === 200,
        'list products: response time OK': (r) => r.timings.duration < 2000,
        'list products: has content': (r) => r.body.length > 0,
      })
      
      productRetrievalRate.add(success)
    })
    
    // 2. Create product (write operation)
    let createdProductId = null
    group('Create Product', () => {
      const productData = generateProductData(vuId, iterationId)
      
      const createResponse = kernLogicAPIClient.productsV1Create(productData)
      
      const success = check(createResponse.response, {
        'create product: status 201 or 400': (r) => [201, 400].includes(r.status),
        'create product: response time OK': (r) => r.timings.duration < 5000,
      })
      
      if (createResponse.response.status === 201) {
        try {
          const body = JSON.parse(createResponse.response.body)
          createdProductId = body.id
        } catch (e) {
          console.error('Failed to parse create response')
        }
      }
      
      productCreationRate.add(success)
    })
    
    // 3. Get product details (if creation was successful)
    if (createdProductId) {
      group('Get Product Details', () => {
        const detailResponse = kernLogicAPIClient.productsV1Retrieve(createdProductId)
        
        const success = check(detailResponse.response, {
          'get product: status 200': (r) => r.status === 200,
          'get product: response time OK': (r) => r.timings.duration < 1000,
          'get product: has product data': (r) => {
            try {
              const body = JSON.parse(r.body)
              return body.id === createdProductId
            } catch {
              return false
            }
          },
        })
        
        productRetrievalRate.add(success)
      })
    }
    
    // 4. Search/filter products (realistic user behavior)
    group('Search Products', () => {
      const searchParams = {
        search: brands[Math.floor(Math.random() * brands.length)]
      }
      
      const searchResponse = kernLogicAPIClient.productsV1List(searchParams)
      
      check(searchResponse.response, {
        'search products: status 200': (r) => r.status === 200,
        'search products: response time OK': (r) => r.timings.duration < 3000,
      })
    })
  })
  
  // Realistic think time between operations
  sleep(Math.random() * 2 + 1) // 1-3 seconds
}

function generateProductData(vuId, iterationId) {
  const timestamp = Date.now()
  const randomCategory = categories[Math.floor(Math.random() * categories.length)]
  const randomBrand = brands[Math.floor(Math.random() * brands.length)]
  
  return {
    name: `Load Test Product VU${vuId}-${iterationId}-${timestamp}`,
    sku: `LT-${vuId}-${iterationId}-${timestamp}`,
    description: `This is a load test product created by VU ${vuId} in iteration ${iterationId}`,
    price: Math.round((Math.random() * 1000 + 10) * 100) / 100, // $10-$1010
    brand: randomBrand,
    category_name: randomCategory,
    is_active: true,
    tags: [`load-test`, `vu-${vuId}`, randomCategory.toLowerCase()]
  }
}

export function teardown(data) {
  console.log('🧹 Product load test completed')
  // Note: In a real scenario, you might want to clean up test data
  // However, for load testing, leaving some test data can be realistic
} 