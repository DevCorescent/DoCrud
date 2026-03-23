import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const historyFilePath = path.join(process.cwd(), 'data', 'history.json');

export async function GET() {
  try {
    const data = fs.readFileSync(historyFilePath, 'utf8');
    const history = JSON.parse(data);
    return NextResponse.json(history);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { documentType, data, generatedAt }: { documentType: string; data: Record<string, string>; generatedAt: string } = await request.json();

    const historyEntry = {
      id: Date.now().toString(),
      documentType,
      data,
      generatedAt,
    };

    const existingData = fs.readFileSync(historyFilePath, 'utf8');
    const history = JSON.parse(existingData);
    history.push(historyEntry);
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2));

    return NextResponse.json({ message: 'History saved' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}