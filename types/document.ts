export interface DocumentField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'date' | 'textarea' | 'number' | 'email' | 'select';
  required: boolean;
  options?: string[]; // For select fields
  placeholder?: string;
  order: number;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  fields: DocumentField[];
  template: string; // HTML string with {{fieldName}}
  isCustom: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'hr' | 'legal' | 'user';
  permissions: string[]; // Array of template IDs or 'all'
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface DocumentHistory {
  id: string;
  templateId: string;
  templateName: string;
  data: Record<string, any>;
  generatedBy: string;
  generatedAt: string;
  pdfUrl?: string;
  emailSent?: boolean;
  emailTo?: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
}