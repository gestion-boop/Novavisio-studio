import {supabase, cloudConfigured} from './cloud';
import type {FloorPlanPoint} from './storage';

export type PlanRoom = {label: string; surfaceM2: number | null; x: number; y: number};
export type PlanReading = {rooms: PlanRoom[]; entrance: {x: number; y: number} | null};

/** Envoie l'image du plan à /api/plan-read (lecture par IA, réservée aux comptes connectés). */
export async function readPlanImage(imageDataUrl: string): Promise<PlanReading> {
  if (!cloudConfigured) throw new Error('Connecte-toi au cloud NovaStudio pour lire le plan.');
  const {data} = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Connecte-toi au cloud NovaStudio pour lire le plan.');
  const r = await fetch('/api/plan-read', {
    method: 'POST', cache: 'no-store',
    headers: {'content-type': 'application/json', authorization: 'Bearer ' + token},
    body: JSON.stringify({image: imageDataUrl}),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || 'Lecture du plan impossible.');
  return {rooms: Array.isArray(json.rooms) ? json.rooms : [], entrance: json.entrance ?? null};
}

/**
 * Associe chaque panorama (placé sur le plan) à la pièce lue la plus proche, une pièce par panorama.
 * Les paires les plus proches sont attribuées en premier ; un panorama sans pièce libre reste sans proposition.
 */
export function matchScenesToRooms(points: FloorPlanPoint[], rooms: PlanRoom[]): Map<string, number> {
  const pairs: {sceneId: string; room: number; d: number}[] = [];
  for (const p of points) rooms.forEach((r, room) => pairs.push({sceneId: p.sceneId, room, d: Math.hypot(p.x - r.x, p.y - r.y)}));
  pairs.sort((a, b) => a.d - b.d);
  const out = new Map<string, number>(), used = new Set<number>();
  for (const pr of pairs) {
    if (out.has(pr.sceneId) || used.has(pr.room)) continue;
    out.set(pr.sceneId, pr.room); used.add(pr.room);
  }
  return out;
}
