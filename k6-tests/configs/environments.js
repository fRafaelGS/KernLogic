// Environment-specific configurations for k6 testing

export const environments = {
  local: {
    baseUrl: 'http://localhost:8000',
    testUser: {
      email: 'test@example.com',
      password: 'testpassword123'
    },
    thresholds: {
      http_req_duration: ['p(95)<3000'],
      http_req_failed: ['rate<0.15'],
    },
    scenarios: {
      light: { vus: 3, duration: '30s' },
      moderate: { vus: 10, duration: '2m' },
      stress: { vus: 25, duration: '5m' }
    }
  },

  development: {
    baseUrl: 'https://dev-api.kernlogic.com',
    testUser: {
      email: 'dev-test@kernlogic.com',
      password: process.env.DEV_TEST_PASSWORD || 'dev-password'
    },
    thresholds: {
      http_req_duration: ['p(95)<2000'],
      http_req_failed: ['rate<0.1'],
    },
    scenarios: {
      light: { vus: 5, duration: '1m' },
      moderate: { vus: 15, duration: '3m' },
      stress: { vus: 50, duration: '10m' }
    }
  },

  staging: {
    baseUrl: 'https://staging-api.kernlogic.com',
    testUser: {
      email: 'staging-test@kernlogic.com',
      password: process.env.STAGING_TEST_PASSWORD || 'staging-password'
    },
    thresholds: {
      http_req_duration: ['p(95)<1500'],
      http_req_failed: ['rate<0.05'],
    },
    scenarios: {
      light: { vus: 10, duration: '2m' },
      moderate: { vus: 25, duration: '5m' },
      stress: { vus: 100, duration: '15m' }
    }
  },

  production: {
    baseUrl: 'https://api.kernlogic.com',
    testUser: {
      email: 'prod-test@kernlogic.com',
      password: process.env.PROD_TEST_PASSWORD || 'prod-password'
    },
    thresholds: {
      http_req_duration: ['p(95)<1000'],
      http_req_failed: ['rate<0.02'],
    },
    scenarios: {
      light: { vus: 5, duration: '1m' },
      moderate: { vus: 20, duration: '3m' },
      stress: { vus: 50, duration: '10m' }
    },
    // Extra strict for production
    rateLimiting: {
      requestsPerSecond: 10,
      burstLimit: 20
    }
  }
}

/**
 * Get configuration for specified environment
 * @param {string} env - Environment name (local, development, staging, production)
 * @param {string} scenario - Scenario type (light, moderate, stress)
 * @returns {object} Configuration object
 */
export function getConfig(env = 'local', scenario = 'light') {
  const environment = environments[env]
  if (!environment) {
    throw new Error(`Unknown environment: ${env}. Available: ${Object.keys(environments).join(', ')}`)
  }

  const scenarioConfig = environment.scenarios[scenario]
  if (!scenarioConfig) {
    throw new Error(`Unknown scenario: ${scenario}. Available: ${Object.keys(environment.scenarios).join(', ')}`)
  }

  return {
    ...environment,
    activeScenario: scenarioConfig,
    environment: env,
    scenario: scenario
  }
}

/**
 * Create k6 options object from environment config
 * @param {string} env - Environment name
 * @param {string} scenario - Scenario type
 * @returns {object} k6 options object
 */
export function createK6Options(env = 'local', scenario = 'light') {
  const config = getConfig(env, scenario)
  
  return {
    scenarios: {
      [scenario]: {
        executor: 'constant-vus',
        vus: config.activeScenario.vus,
        duration: config.activeScenario.duration,
        tags: { 
          environment: env, 
          scenario: scenario 
        }
      }
    },
    thresholds: config.thresholds,
    ext: {
      loadimpact: {
        name: `KernLogic ${env.toUpperCase()} - ${scenario} test`,
        projectID: parseInt(__ENV.K6_PROJECT_ID || '0')
      }
    }
  }
}

/**
 * Get environment variables for k6 test
 * @param {string} env - Environment name
 * @returns {object} Environment variables
 */
export function getEnvVars(env = 'local') {
  const config = getConfig(env)
  
  return {
    BASE_URL: config.baseUrl,
    TEST_EMAIL: config.testUser.email,
    TEST_PASSWORD: config.testUser.password,
    ENVIRONMENT: env
  }
} 