import { apiFetch } from "./client";

export interface CatalogService {
  id: string;
  name: string;
  slug: string;
  pricing_type: string;
  starting_price: number | null;
  is_active: boolean;
}

export interface CatalogSubcategory {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  services: CatalogService[];
}

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
  subcategories: CatalogSubcategory[];
}

export function listCategories() {
  return apiFetch<CatalogCategory[]>("/categories");
}

export function getSupportInfo() {
  return apiFetch<{ support_phone: string | null }>("/support-info");
}

export interface NearbyProvider {
  provider_id: string;
  name: string | null;
  bio: string | null;
  experience_years: number | null;
  verification_status: string;
  distance_km: number;
  average_rating: number | null;
  review_count: number;
}

export function findNearbyProviders(lat: number, lng: number, opts?: { serviceSlug?: string; radiusKm?: number }) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (opts?.serviceSlug) params.set("service_slug", opts.serviceSlug);
  if (opts?.radiusKm) params.set("radius_km", String(opts.radiusKm));
  return apiFetch<NearbyProvider[]>(`/providers/nearby?${params.toString()}`);
}
