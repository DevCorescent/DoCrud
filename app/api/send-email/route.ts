import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, text, attachment }: { to: string; subject: string; text: string; attachment?: Buffer } = await request.json();

    // Create transporter (using Gmail as example, configure as needed)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions: any = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    };

    if (attachment) {
      mailOptions.attachments = [
        {
          filename: 'document.pdf',
          content: Buffer.from(attachment),
        },
      ];
    }

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}