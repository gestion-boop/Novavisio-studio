/** Croix de fermeture dessinée en SVG : toujours parfaitement centrée (contrairement au caractère ✕ / ×). */
export function XMark({size=18}:{size?:number}){
  return <svg className="nv-xmark" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>;
}
