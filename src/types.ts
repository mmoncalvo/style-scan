export interface User {
  id: string;
  username: string;
  role: string;
  fullName?: string;
  email?: string;
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
  acne: number;
  imageUrl: string;
  createdAt: string;
  isMock?: boolean;
  masks?: Record<string, string>;
}
