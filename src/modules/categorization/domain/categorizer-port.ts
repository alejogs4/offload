export interface CategorizationResult {
  category: string;
  subcategory: string;
}

export interface CategorizerPort {
  categorize(title: string, description: string, url: string): Promise<CategorizationResult>;
}
