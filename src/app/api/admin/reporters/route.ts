import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { reporterId, banned, banReason } = await request.json();

    const reporter = await prisma.reporter.update({
      where: { id: reporterId },
      data: { banned, banReason: banned ? banReason : null },
    });

    return NextResponse.json({ success: true, reporter });
  } catch (error) {
    console.error('Reporter update error:', error);
    return NextResponse.json({ error: 'Failed to update reporter' }, { status: 500 });
  }
}
