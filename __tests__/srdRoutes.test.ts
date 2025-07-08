import handlerRaces from '../pages/api/races';
import handlerClasses from '../pages/api/classes';
import { getRaces, getClasses } from '../lib/srd';

jest.mock('../lib/srd');

describe('SRD API routes', () => {
  it('returns races', async () => {
    (getRaces as jest.Mock).mockResolvedValue(['Human']);
    const req = {} as any;
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })) } as any;
    await handlerRaces(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(['Human']);
  });

  it('returns classes', async () => {
    (getClasses as jest.Mock).mockResolvedValue(['Wizard']);
    const req = {} as any;
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })) } as any;
    await handlerClasses(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(['Wizard']);
  });
});
