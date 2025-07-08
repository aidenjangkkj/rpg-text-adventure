export interface ListItem {
  index: string;
  name: string;
  url: string;
}

const BASE_URL = 'https://www.dnd5eapi.co/api';

export async function getRaces(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/races`);
  if (!res.ok) {
    throw new Error(`SRD API error: ${res.status}`);
  }
  const data = await res.json();
  return (data.results as ListItem[]).map((r) => r.name);
}

export async function getClasses(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/classes`);
  if (!res.ok) {
    throw new Error(`SRD API error: ${res.status}`);
  }
  const data = await res.json();
  return (data.results as ListItem[]).map((c) => c.name);
}
