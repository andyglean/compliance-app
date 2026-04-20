import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzePhoto, calculatePriorityScore } from '@/lib/openai';
import { notifyManagement, notifyPropertyOwner, notifyEscalation } from '@/lib/notifications';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DAILY_LIMIT = 5;
const ESCALATION_THRESHOLD = 3;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const reporterId = formData.get('reporterId') as string;
    const address = formData.get('address') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string | null;
    const photos = formData.getAll('photos') as File[];

    if (!reporterId || !address || !category || photos.length === 0) {
      return NextResponse.json(
        { error: 'Reporter ID, address, category, and at least one photo are required' },
        { status: 400 }
      );
    }

    const validCategories = ['overgrown_yard', 'junk_trash', 'unauthorized_vehicle'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid violation category' },
        { status: 400 }
      );
    }

    const reporter = await prisma.reporter.findUnique({ where: { id: reporterId } });
    if (!reporter || !reporter.verified) {
      return NextResponse.json(
        { error: 'Reporter not found or not verified' },
        { status: 403 }
      );
    }

    if (reporter.banned) {
      return NextResponse.json(
        { error: 'This account has been restricted from submitting reports.' },
        { status: 403 }
      );
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailyCount = await prisma.complaint.count({
      where: {
        reporterId,
        createdAt: { gte: todayStart },
      },
    });

    if (dailyCount >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: `You've reached the daily limit of ${DAILY_LIMIT} reports. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    let property = await prisma.property.findUnique({ where: { address } });
    if (!property) {
      property = await prisma.property.create({ data: { address } });
    }

    const existingComplaint = await prisma.complaint.findUnique({
      where: {
        reporterId_propertyId_category: {
          reporterId,
          propertyId: property.id,
          category,
        },
      },
    });

    if (existingComplaint) {
      return NextResponse.json(
        { error: 'You have already submitted a report for this category at this address.' },
        { status: 409 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const photoUrls: string[] = [];
    let aiResult = null;

    for (const photo of photos) {
      const buffer = Buffer.from(await photo.arrayBuffer());
      const filename = `${uuidv4()}-${photo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      photoUrls.push(`/uploads/${filename}`);

      if (!aiResult) {
        const base64 = buffer.toString('base64');
        aiResult = await analyzePhoto(base64, category);
      }
    }

    const complaint = await prisma.complaint.create({
      data: {
        reporterId,
        propertyId: property.id,
        category,
        description: description || null,
        photoUrls: JSON.stringify(photoUrls),
        aiAnalysis: aiResult ? JSON.stringify(aiResult) : null,
        aiSeverity: aiResult?.severity || 5,
        flagged: aiResult?.flagged || false,
        flagReason: aiResult?.flagReason || null,
      },
    });

    const uniqueReporters = await prisma.complaint.groupBy({
      by: ['reporterId'],
      where: { propertyId: property.id },
    });
    const complaintCount = uniqueReporters.length;

    const allComplaints = await prisma.complaint.findMany({
      where: { propertyId: property.id },
    });
    const avgSeverity = allComplaints.reduce((sum, c) => sum + c.aiSeverity, 0) / allComplaints.length;
    const oldestComplaint = allComplaints.reduce((oldest, c) =>
      c.createdAt < oldest.createdAt ? c : oldest
    );
    const daysActive = Math.ceil((Date.now() - oldestComplaint.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const priorityScore = await calculatePriorityScore(complaintCount, avgSeverity, daysActive);

    const categories = [...new Set(allComplaints.map(c => c.category))].join(',');

    const status = complaintCount >= ESCALATION_THRESHOLD ? 'urgent' : 'monitoring';

    const existingItem = await prisma.complianceItem.findUnique({
      where: { propertyId: property.id },
    });

    if (existingItem) {
      const wasMonitoring = existingItem.status === 'monitoring';
      await prisma.complianceItem.update({
        where: { propertyId: property.id },
        data: {
          complaintCount,
          priorityScore,
          categories,
          status,
          ...(status === 'urgent' && wasMonitoring ? { escalatedAt: new Date() } : {}),
        },
      });

      if (status === 'urgent' && wasMonitoring) {
        await notifyEscalation(address, property.id);
      }
    } else {
      await prisma.complianceItem.create({
        data: {
          propertyId: property.id,
          complaintCount,
          priorityScore,
          categories,
          status,
          ...(status === 'urgent' ? { escalatedAt: new Date() } : {}),
        },
      });

      if (status === 'urgent') {
        await notifyEscalation(address, property.id);
      }
    }

    await notifyManagement(address, category, complaintCount, property.id);

    if (complaintCount === 1) {
      await notifyPropertyOwner(address, category, property.id);
    }

    return NextResponse.json({
      success: true,
      complaintId: complaint.id,
      complaintNumber: complaintCount,
      status,
      flagged: aiResult?.flagged || false,
    });
  } catch (error) {
    console.error('Complaint submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit complaint' },
      { status: 500 }
    );
  }
}
