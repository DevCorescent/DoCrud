import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { documentTemplates } from '../../../data/templates';
import { DocumentTemplate } from '../../../types/document';

export async function GET() {
  try {
    // Get custom templates
    const customTemplatesPath = path.join(process.cwd(), 'data', 'custom', 'templates.json');
    let customTemplates: DocumentTemplate[] = [];

    try {
      const customData = await fs.readFile(customTemplatesPath, 'utf8');
      customTemplates = JSON.parse(customData);
    } catch (error) {
      // Custom templates file doesn't exist yet, use empty array
    }

    // Combine default and custom templates
    const allTemplates = [
      ...documentTemplates.map(template => ({
        ...template,
        isCustom: false,
        category: getCategoryFromId(template.id),
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        version: 1,
      })),
      ...customTemplates
    ];

    return NextResponse.json(allTemplates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

function getCategoryFromId(id: string): string {
  const categories: Record<string, string> = {
    'appointment-letter': 'HR',
    'offer-letter': 'HR',
    'termination-letter': 'HR',
    'resignation-letter': 'HR',
    'performance-appraisal': 'HR',
    'nda': 'Legal',
    'employment-contract': 'Legal',
    'loan-agreement': 'Legal',
    'service-agreement': 'Legal',
    'partnership-agreement': 'Legal',
    'invoice': 'Finance',
    'quotation': 'Finance',
    'receipt': 'Finance',
    'payment-reminder': 'Finance',
    'meeting-minutes': 'General',
    'memo': 'General',
    'announcement': 'General',
  };
  return categories[id] || 'General';
}