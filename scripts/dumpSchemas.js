/**
 * Script to extract schema information from OpenAPI YAML and generate markdown documentation
 * 
 * Usage: node scripts/dumpSchemas.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

// Get current directory name
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const OPENAPI_FILE = path.join(__dirname, '../backend/KernLogic API.yaml')
const OUTPUT_FILE = path.join(__dirname, '../docs/data-model.md')

/**
 * Get data type string representation from schema property
 * @param {Object} property - Schema property object
 * @returns {string} Type representation
 */
function getPropertyType(property) {
  if (!property) return 'unknown'
  
  if (property.type) {
    if (property.type === 'array' && property.items) {
      if (property.items.$ref) {
        const refName = property.items.$ref.split('/').pop()
        return `array<${refName}>`
      }
      return `array<${property.items.type || 'any'}>`
    }
    return property.type
  }
  
  if (property.$ref) {
    return property.$ref.split('/').pop()
  }
  
  if (property.oneOf) {
    return property.oneOf.map(item => {
      if (item.$ref) return item.$ref.split('/').pop()
      return item.type || 'any'
    }).join(' | ')
  }
  
  if (property.anyOf) {
    return property.anyOf.map(item => {
      if (item.$ref) return item.$ref.split('/').pop()
      return item.type || 'any'
    }).join(' | ')
  }
  
  return 'any'
}

/**
 * Escape markdown special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
}

/**
 * Generate table of contents
 * @param {Array<string>} schemaNames - List of schema names
 * @returns {string} Markdown TOC
 */
function generateTOC(schemaNames) {
  let toc = '## Table of Contents\n\n'
  
  schemaNames.forEach(name => {
    // Create link-friendly name (lowercase, spaces to hyphens)
    const link = `schema-${name.toLowerCase().replace(/\s+/g, '-')}`
    toc += `- [${name}](#${link})\n`
  })
  
  return toc + '\n'
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Loading OpenAPI specification...')
    
    // Read and parse YAML file
    const fileContents = fs.readFileSync(OPENAPI_FILE, 'utf8')
    const spec = yaml.load(fileContents)
    
    if (!spec.components || !spec.components.schemas) {
      throw new Error('No schemas found in the OpenAPI specification')
    }
    
    const schemas = spec.components.schemas
    const schemaNames = Object.keys(schemas).sort()
    
    console.log(`Found ${schemaNames.length} schemas in the specification`)
    
    // Create markdown content
    let markdown = '# KernLogic Data Model\n\n'
    markdown += 'This document was automatically generated from the OpenAPI specification.\n\n'
    
    // Add table of contents
    markdown += generateTOC(schemaNames)
    
    // Process each schema
    schemaNames.forEach(schemaName => {
      const schema = schemas[schemaName]
      console.log(`Processing schema: ${schemaName}`)
      
      markdown += `## Schema: ${schemaName}\n\n`
      
      // Add schema description if available
      if (schema.description) {
        markdown += `${schema.description}\n\n`
      }
      
      // Create property table
      markdown += '| Field | Type | Description |\n'
      markdown += '| ----- | ---- | ----------- |\n'
      
      // If no properties, add a note
      if (!schema.properties || Object.keys(schema.properties).length === 0) {
        markdown += '| *No properties defined* | | |\n\n'
      } else {
        // Add properties
        const properties = schema.properties
        const propertyNames = Object.keys(properties).sort()
        
        propertyNames.forEach(propName => {
          const property = properties[propName]
          const type = getPropertyType(property)
          const description = escapeMarkdown(property.description || '')
          
          markdown += `| ${propName} | ${type} | ${description} |\n`
        })
        
        // Add required fields note if available
        if (schema.required && schema.required.length > 0) {
          markdown += '\n**Required fields:** ' + schema.required.join(', ') + '\n'
        }
      }
      
      // Add spacing between schemas
      markdown += '\n\n'
    })
    
    // Write markdown to file
    fs.writeFileSync(OUTPUT_FILE, markdown)
    console.log(`Documentation generated successfully at ${OUTPUT_FILE}`)
    
  } catch (error) {
    console.error('Error generating documentation:', error)
    process.exit(1)
  }
}

// Run the main function
main() 