import { check } from 'k6'
import { KernLogicAPIClient } from '../kernlogic-api.js'

// Smoke test configuration
export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.05'],    // Less than 5% of requests should fail
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'
const TEST_EMAIL = __ENV.TEST_EMAIL || 'test@example.com'
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'testpassword123'

const kernLogicAPIClient = new KernLogicAPIClient({ 
  baseUrl: BASE_URL 
})

export default function() {
  console.log('🔍 Running smoke test for KernLogic API...')
  
  // Test 1: Authentication
  const authResponse = kernLogicAPIClient.tokenCreate({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })
  
  const authSuccess = check(authResponse.response, {
    'smoke: auth endpoint available': (r) => r.status !== 0,
    'smoke: auth returns valid response': (r) => [200, 400, 401].includes(r.status),
  })
  
  if (!authSuccess) {
    console.error('❌ Authentication endpoint failed')
    return
  }
  
  // Test 2: Products endpoint
  const productsResponse = kernLogicAPIClient.productsList()
  
  check(productsResponse.response, {
    'smoke: products endpoint available': (r) => r.status !== 0,
    'smoke: products returns valid response': (r) => [200, 401, 403].includes(r.status),
  })
  
  // Test 3: Categories endpoint
  const categoriesResponse = kernLogicAPIClient.categoriesList()
  
  check(categoriesResponse.response, {
    'smoke: categories endpoint available': (r) => r.status !== 0,
    'smoke: categories returns valid response': (r) => [200, 401, 403].includes(r.status),
  })
  
  console.log('✅ Smoke test completed')
} 