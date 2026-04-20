import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode, generateVerificationCode, isDemoMode } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone || !/^\+1\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Please enter a valid US phone number' },
        { status: 400 }
      );
    }

    const reporter = await prisma.reporter.findUnique({ where: { phone } });
    if (reporter?.banned) {
      return NextResponse.json(
        { error: 'This phone number has been restricted from submitting reports.' },
        { status: 403 }
      );
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCodes = await prisma.verificationCode.count({
      where: {
        phone,
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (recentCodes >= 3) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationCode.create({
      data: { phone, code, expiresAt },
    });

    await sendVerificationCode(phone, code);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      ...(isDemoMode ? { demoCode: code } : {}),
    });
  } catch (error) {
    console.error('Send code error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
