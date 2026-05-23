export type Stem = {
  id: string;
  name: string;
  fileUrl: string;
  color: string;
  fileName: string;
  price?: string;
  purchaseUrl?: string;
};

export type Track = {
  id: string;
  title: string;
  artistName?: string;
  fullStemsPrice?: string;
  purchaseUrl?: string;
  fullStemsPurchaseUrl?: string;
  stems: Stem[];
  createdAt?: string;
};
