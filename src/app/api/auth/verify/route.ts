import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone and code are required' },
        { status: 400 }
      );
    }

    const verification = await prisma.verificationCode.findFirst({
      where: {
        phone,
        code,
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please try again.' },
        { status: 400 }
      );
    }

    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { used: true },
    });

    let reporter = await prisma.reporter.findUnique({ where: { phone } });
    if (!reporter) {
      reporter = await prisma.reporter.create({
        data: { phone, verified: true },
      });
    } else {
      await prisma.reporter.update({
        where: { phone },
        data: { verified: true },
      });
    }

    return NextResponse.json({
      success: true,
      reporterId: reporter.id,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
