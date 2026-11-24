/**
 * Shared panorama lens settings for the editor, public viewer and exported HTML.
 *
 * Photo Sphere Viewer: zoom 0 = widest, zoom 100 = tightest.
 * The old viewer used minFov=35/maxFov=75 and fallback zoom 60, which cropped
 * indoor rooms. The updated optical range is kept below 90 degrees vertically
 * to avoid the severe edge distortion caused by ultra-wide perspective.
 * Update 24/11: widest field raised to 120° at the user's request (visits felt too zoomed in).
 *
 * No existing project is rewritten. Legacy stored entry zoom values are
 * interpreted with a one-time optical offset until the user explicitly saves
 * a new arrival view, which is then tagged as the new model.
 */
export const PANORAMA_MIN_FOV = 35;
/** Champ de vision vertical le plus large (zoom 0). 120° (avant : 90°) : la visite arrive moins zoomée et le visiteur peut dézoomer davantage. */
export const PANORAMA_MAX_FOV = 120;
export const PANORAMA_DEFAULT_ZOOM = 30;
const LEGACY_ZOOM_OFFSET = 25;

type ArrivalZoom = {
  arrivalZoom?:number;
  arrivalZoomModel?:'wide';
} | null | undefined;

export function panoramaArrivalZoom(arrival:ArrivalZoom):number{
  if(arrival?.arrivalZoom===undefined)return PANORAMA_DEFAULT_ZOOM;
  const value=arrival.arrivalZoomModel==='wide'
    ?arrival.arrivalZoom
    :arrival.arrivalZoom-LEGACY_ZOOM_OFFSET;
  return Math.max(0,Math.min(100,value));
}
