import '@testing-library/jest-dom'

// Add polyfills for MSW
import { TextEncoder, TextDecoder } from 'util'

// @ts-ignore
global.TextEncoder = TextEncoder
// @ts-ignore 
global.TextDecoder = TextDecoder

// No need for fetch polyfills since we're using axios mocking

// Mock import.meta for Jest
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: 'http://localhost:8000',
        VITE_API_URL: 'http://localhost:8000'
      }
    }
  }
}) 