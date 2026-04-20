import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SAMPLE_STREETS = [
  'Travis Ranch Blvd', 'Lone Star Dr', 'Mustang Way', 'Longhorn Ln',
  'Bluebonnet Ct', 'Pecan Grove Dr', 'Cattle Trail', 'Pioneer Path',
  'Sunset Ridge Dr', 'Mesquite Bend', 'Windmill Rd', 'Prairie View Dr',
  'Coyote Creek Ln', 'Red River Rd', 'Sagebrush Trl', 'Frontier Dr',
  'Heritage Oak Dr', 'Stallion Run', 'Canyon View Ct', 'Timber Creek Dr',
];

function generateSampleAddresses(): string[] {
  const addresses: string[] = [];
  for (const street of SAMPLE_STREETS) {
    for (let num = 100; num <= 500; num += 10) {
      addresses.push(`${num} ${street}`);
    }
  }
  return addresses;
}

const sampleAddresses = generateSampleAddresses();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.toLowerCase() || '';

  if (query.length < 2) {
    return NextResponse.json({ addresses: [] });
  }

  const dbProperties = await prisma.property.findMany({
    where: {
      address: { contains: query },
    },
    select: { address: true },
    take: 10,
  });

  const dbAddresses = dbProperties.map((p) => p.address);

  const sampleMatches = sampleAddresses
    .filter((a) => a.toLowerCase().includes(query))
    .slice(0, 10);

  const combined = [...new Set([...dbAddresses, ...sampleMatches])].slice(0, 10);

  return NextResponse.json({ addresses: combined });
}
