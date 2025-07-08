import type { NextApiRequest, NextApiResponse } from 'next';
import { getRaces } from '@/lib/srd';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string[]>
) {
  try {
    const races = await getRaces();
    res.status(200).json(races);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json([msg]);
  }
}
