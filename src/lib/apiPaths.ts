/* -----------------------------------------------------------------------
 * Immutable, centralised API-path builder – SINGLE source of truth.
 * -------------------------------------------------------------------- */

export const API_BASE = '/api';        //  ← never edit elsewhere

const join = (...parts: (string | number)[]) =>
  parts
    .filter(Boolean)
    .map(p => p.toString().replace(/^\/|\/$/g, '')) // trim slashes
    .join('/')
    .replace(/^/, '/');                             // ensure leading slash

export const paths = {
  auth: {
    token:   () => join(API_BASE, 'token')   + '/',   //   /api/token/
    refresh: () => join(API_BASE, 'token/refresh') + '/',   // /api/token/refresh/
  },
  products: {
    root:    () => join(API_BASE, 'products') + '/',
    byId:    (id: number)          => join(API_BASE, 'products', id) + '/',
    nested:  (id: number, child: string) =>
                                  join(API_BASE, 'products', id, child) + 
                                    (child.endsWith('/') ? '' : '/'),
    assets:  (id: number)          => join(API_BASE, 'products', id, 'assets') + '/',
    asset:   (id: number, aid: number) => {
      const url = join(API_BASE, 'products', id, 'assets', aid) + '/';
      console.log(`Creating asset URL for product ${id}, asset ${aid}: ${url}`);
      return url;
    },
    attributes: (id: number) => join(API_BASE, 'products', id, 'attributes') + '/',
    attributeValue: (id: number, avId: number) => join(API_BASE, 'products', id, 'attributes', avId) + '/',
    groups: (id: number) => join(API_BASE, 'products', id, 'attribute-groups') + '/',
  },
  attributes: {
    root: () => join(API_BASE, 'attributes') + '/',
    byId: (id: number) => join(API_BASE, 'attributes', id) + '/',
  },
  attributeGroups: {
    root: () => join(API_BASE, 'attribute-groups') + '/',
    byId: (id: number) => join(API_BASE, 'attribute-groups', id) + '/',
    addItem: (id: number) => join(API_BASE, 'attribute-groups', id, 'items') + '/',
    removeItem: (gid: number, itemId: number) => join(API_BASE, 'attribute-groups', gid, 'items', itemId) + '/',
  },
  attributeSets: {
    byId:    (id: number)          => join(API_BASE, 'attribute-sets', id) + '/',
  },
  dashboard: () => join(API_BASE, 'dashboard') + '/',
} as const; 