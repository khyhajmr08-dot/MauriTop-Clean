export interface ServicePackage {
  amount: number;
  quantity: number;
  unit?: string;
  name?: string;
  nameAr?: string;
  nameFr?: string;
  badge?: string;
  bonus?: number;
  id?: string;
  title?: string;
  titleAr?: string;
}

export interface ServiceField {
  id: string;
  label: string;
  labelAr?: string;
  labelFr?: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  placeholderAr?: string;
  placeholderFr?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  options?: any[];
  [key: string]: any;
}

export interface Service {
  id: string;
  name: string;
  nameAr?: string;
  nameFr?: string;
  description?: string;
  descriptionAr?: string;
  descriptionFr?: string;
  category?: string;
  categoryAr?: string;
  categoryFr?: string;
  image?: string;
  imageUrl?: string;
  imageFit?: 'cover' | 'contain';
  imagePadding?: number;
  suggestedPrice?: number;
  priceMru?: number;
  price?: number;
  minAmount?: number;
  maxAmount?: number;
  minAmountMru?: number;
  maxAmountMru?: number;
  ratePerUnit?: number;
  unit?: string;
  badge?: string;
  badgeAr?: string;
  badgeFr?: string;
  status?: string;
  isDeleted?: boolean;
  order?: number;
  pricingMode?: 'fixed' | 'range' | 'quote' | 'custom' | string;
  requiredFields?: string[];
  optionalFields?: string[];
  fields?: ServiceField[];
  packages?: ServicePackage[];
  isPopular?: boolean;
  isFeatured?: boolean;
  featuredOrder?: number;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

export type OrderStatus = 'pending' | 'completed' | 'rejected' | 'approved' | 'shipped';

export interface Order {
  id: string;
  userId: string;
  userEmail?: string;
  serviceId: string;
  serviceName: string;
  serviceType?: string;
  amount: number;
  total?: number;
  quantity?: number;
  unit?: string;
  status: OrderStatus | string;
  paymentMethod: 'bankily' | 'sadad' | 'gaza' | string;
  senderPhone?: string;
  receiptUrl?: string;
  fields?: Record<string, any>;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}
