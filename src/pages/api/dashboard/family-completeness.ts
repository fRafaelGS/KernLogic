import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

// Ensure @types/next is installed and '@/lib/prisma' exists and exports your Prisma client

interface FamilyCompleteness {
  familyName: string
  percentage: number
}

const REQUIRED_ATTRIBUTE_KEYS = [
  'name',
  'sku',
  'description',
  'price',
  // Add all required attribute keys here, or fetch from DB if dynamic
]

function isProductComplete(product: { attributes: Record<string, any> }): boolean {
  return REQUIRED_ATTRIBUTE_KEYS.every(key => {
    const value = product.attributes?.[key]
    return value !== undefined && value !== null && value !== ''
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FamilyCompleteness[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Fetch all families
    const families = await prisma.productFamily.findMany({
      select: { id: true, name: true }
    })

    // Fetch all products with their family and attributes
    const products = await prisma.product.findMany({
      select: { id: true, familyId: true, attributes: true }
    })

    // Group products by familyId
    const productsByFamily: Record<string, typeof products> = {}
    for (const product of products) {
      if (!productsByFamily[product.familyId]) productsByFamily[product.familyId] = []
      productsByFamily[product.familyId].push(product)
    }

    const result: FamilyCompleteness[] = families.map((fam: { id: string; name: string }) => {
      const famProducts = productsByFamily[fam.id] || []
      const total = famProducts.length
      if (total === 0) return { familyName: fam.name, percentage: 0 }
      const completeCount = famProducts.filter(isProductComplete).length
      const percentage = Math.round((completeCount / total) * 100)
      return { familyName: fam.name, percentage }
    })

    return res.status(200).json(result)
  } catch (err) {
    // Log error for observability
    // eslint-disable-next-line no-console
    console.error('Failed to compute family completeness', err)
    return res.status(500).json({ error: 'Failed to compute family completeness' })
  }
} 