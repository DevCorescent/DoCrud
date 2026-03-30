import NextAuth from 'next-auth';
import { SaasSubscription } from '@/types/document';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      permissions: string[];
      organizationName?: string | null;
      subscription?: SaasSubscription;
      planFeatures?: string[];
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
    permissions: string[];
    organizationName?: string | null;
    subscription?: SaasSubscription;
    planFeatures?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    permissions: string[];
    organizationName?: string | null;
    subscription?: SaasSubscription;
    planFeatures?: string[];
  }
}
