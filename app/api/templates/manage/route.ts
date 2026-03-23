import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { DocumentTemplate } from '../../../../types/document';

const templatesPath = path.join(process.cwd(), 'data', 'custom', 'templates.json');

async function getCustomTemplates(): Promise<DocumentTemplate[]> {
  try {
    const data = await fs.readFile(templatesPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveCustomTemplates(templates: DocumentTemplate[]): Promise<void> {
  await fs.writeFile(templatesPath, JSON.stringify(templates, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'> = await request.json();

    const customTemplates = await getCustomTemplates();

    const newTemplate: DocumentTemplate = {
      ...template,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    customTemplates.push(newTemplate);
    await saveCustomTemplates(customTemplates);

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates }: Partial<DocumentTemplate> & { id: string } = await request.json();

    const customTemplates = await getCustomTemplates();
    const templateIndex = customTemplates.findIndex(t => t.id === id);

    if (templateIndex === -1) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    customTemplates[templateIndex] = {
      ...customTemplates[templateIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
      version: (customTemplates[templateIndex].version || 0) + 1,
    };

    await saveCustomTemplates(customTemplates);

    return NextResponse.json(customTemplates[templateIndex]);
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const customTemplates = await getCustomTemplates();
    const filteredTemplates = customTemplates.filter(t => t.id !== id);

    if (filteredTemplates.length === customTemplates.length) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await saveCustomTemplates(filteredTemplates);

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}