import { useMemo } from "react";
import type { Product } from "@/services/productService";

/** Extract **all** category names (roots + children) for the dropdown */
export function useUniqueCategories(products: Product[]) {
  return useMemo(() => {
    const names = new Set<string>();
    for (const p of products) {
      const raw = p.category;
      if (Array.isArray(raw)) {
        // add every ancestor's name
        raw.forEach(c => {
          if (typeof c === "object" && c?.name) {
            names.add(c.name);
          }
        });
      } else if (typeof raw === "object" && raw?.name) {
        names.add(raw.name);
      }
    }
    return Array.from(names).sort();
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
