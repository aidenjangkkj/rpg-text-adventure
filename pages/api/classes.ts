import type { NextApiRequest, NextApiResponse } from 'next';
import { getClasses } from '@/lib/srd';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string[]>
) {
  try {
    const classes = await getClasses();
    res.status(200).json(classes);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json([msg]);
  }
}
