export interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  category: 'Minifigure' | 'Set' | 'Piece';
  imageURL: string[];
  pieces: number;
  createdAt: string;
}

export interface ProductFormData {
  name: string;
  price: string;
  stock: string;
  description: string;
  category: 'Minifigure' | 'Set' | 'Piece';
  pieces: string;
  images?: any[];
  removeImages?: boolean;
  existingImages?: string[];
} 