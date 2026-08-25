import { Users, Package } from 'lucide-react';

export const SERVICE_TYPE_OPTIONS = [
  {
    value: 'human',
    label: 'Human Verification',
    description: 'Verify identities, documents and credentials for people.',
    icon: Users,
  },
  {
    value: 'product',
    label: 'Product Verification',
    description: 'Verify products, categories and warranty records.',
    icon: Package,
  },
];
