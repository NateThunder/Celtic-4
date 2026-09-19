export type CatalogRecord = Record<string, unknown> & { id: number; slug?: string };

export type ProductCatalog = {
  version: 1;
  updatedAt: string;
  products: CatalogRecord[];
  categories: CatalogRecord[];
  variations: Record<string, CatalogRecord[]>;
};

export type ProductSyncPayload = {
  eventId: string;
  mode: "full" | "upsert" | "delete";
  product?: CatalogRecord;
  productId?: number;
  categories?: CatalogRecord[];
  variations?: CatalogRecord[];
  products?: CatalogRecord[];
  variationsByProduct?: Record<string, CatalogRecord[]>;
};
