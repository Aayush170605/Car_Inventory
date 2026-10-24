import { useId } from 'react';

/** Original SVG illustration; intentionally stylized rather than model-specific photography. */
export function CarArt({ color = '#507568', suv = false }: { color?: string; suv?: boolean }) {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="0 0 440 210" role="img" aria-label="Stylized vehicle illustration" className="car-art">
    <defs>
      <linearGradient id={`${id}-paint`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color}/><stop offset="1" stopColor="#243b36"/></linearGradient>
      <linearGradient id={`${id}-glass`}><stop stopColor="#afc4c0"/><stop offset="1" stopColor="#405a57"/></linearGradient>
      <radialGradient id={`${id}-shadow`}><stop stopColor="#243b36" stopOpacity=".25"/><stop offset="1" stopColor="#243b36" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="223" cy="169" rx="184" ry="19" fill={`url(#${id}-shadow)`}/>
    <path d={suv ? 'M65 127 L90 92 L145 59 Q169 48 265 53 L316 96 L370 110 Q389 115 391 141 L383 154 L53 154 L48 140 Q49 130 65 127Z' : 'M61 128 L99 116 L149 74 Q169 59 249 66 L307 106 L367 118 Q388 124 391 145 L381 155 L54 155 L47 142 Q49 132 61 128Z'} fill={`url(#${id}-paint)`}/>
    <path d={suv ? 'M106 94 L151 62 Q174 55 202 56 L201 96Z M211 56 L262 58 L306 98 L211 96Z' : 'M115 113 L155 79 Q174 67 202 69 L202 108Z M212 69 L246 72 L291 108 L212 108Z'} fill={`url(#${id}-glass)`} stroke="#263f39" strokeWidth="3"/>
    <path d="M82 123 Q207 109 360 123" fill="none" stroke="#ffffff" strokeOpacity=".35" strokeWidth="2"/>
    <path d="M205 112 L205 149 M303 116 L302 150" stroke="#102d26" opacity=".35"/>
    <path d="M60 145 L378 145" stroke="#152d28" strokeWidth="5"/>
    <rect x="215" y="116" width="17" height="4" rx="2" fill="#b9ccc7"/>
    <rect x="157" y="117" width="15" height="4" rx="2" fill="#b9ccc7"/>
    <path d="M365 122 L385 130 L382 136 L359 131Z" fill="#f8efc9"/>
    <path d="M53 132 L72 127 L72 138 L49 141Z" fill="#c46b50"/>
    {[112, 329].map(x => <g key={x}><circle cx={x} cy="149" r="28" fill="#20302c"/><circle cx={x} cy="149" r="18" fill="#c0ccc7"/><circle cx={x} cy="149" r="12" fill="#586862"/><path d={`M${x} 135V163 M${x-14} 149H${x+14} M${x-10} 139L${x+10} 159 M${x+10} 139L${x-10} 159`} stroke="#dce3df" strokeWidth="3"/><circle cx={x} cy="149" r="4" fill="#92a29b"/></g>)}
    <path d="M65 119 L84 114" stroke="#ffffff" opacity=".2" strokeWidth="2"/>
  </svg>;
}
