import { useMemo } from "react";
import type { Product } from "@/services/productService";
import { normalizeCategory } from "@/types/categories";

/**
 * All distinct non-empty categories present in the given list.
 */
export function useUniqueCategories(products: Product[]) {
  return useMemo(() => {
    if (!Array.isArray(products)) return [];

    const set = new Set<string>(
      products
        .map((p) => {
          // Normalize the category to safely access the name property
          const category = normalizeCategory(p.category);
          // Safe access to name property
          const categoryName = category && category.name ? category.name.trim() : '';
          return categoryName;
        })
        .filter(Boolean),
    );

    return Array.from(set);
  }, [products]);
}

/**
 * All distinct tag strings found in a product list.
 * (Objects / IDs are simplified to their string value.)
 */
export function useUniqueTags(products: Product[]) {
  return useMemo(() => {
    if (!Array.isArray(products)) return [];

    const tagSet = new Set<string>();

    products.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (t) tagSet.add(String(t));
        });
      }
    });

    return Array.from(tagSet);
  }, [products]);
}
