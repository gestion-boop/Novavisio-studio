/** Page intégrée (iframe) : plein cadre, sans bandeau d'avertissement. */
export function EmbeddedPage({url,title}:{url:string;title:string}){
 return <div className="nv-embedded-page">
 <iframe title={title} src={url} sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen"/></div>;
}
