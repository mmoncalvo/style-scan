export interface User {
  id: string;
  username: string;
  role: 'admin' | 'cliente';
  fullName?: string;
  email?: string;
}

export interface Product {
  id: number;
  target: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  range: number;
}

export interface SkinAnalysis {
  id: string;
  skinScore: number;
  skinAge: number;
  skinType: string;
  spots: number;
  wrinkles: number;
  texture: number;
  darkCircles: number;
  pores: number;
  redness: number;
  oiliness: number;
  moisture: number;
  eyebag: number;
  droopyEyelid: number;
  droopyLowerEyelid: number;
  acne: number;
  imageUrl: string;
  createdAt: string;
  isMock?: boolean;
  masks?: Record<string, string>;
}
