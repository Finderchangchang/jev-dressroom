import {getItem} from './wardrobe.mjs';
export const escapeXml = value => String(value).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const ink='#303a2e';
function outfitShape(id){
  const s=`stroke="${ink}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
  const base=`<path d="m111 224-24 60 18 7 26-44m78-23 24 60-18 7-24-44" fill="#252b25" ${s}/>`;
  const clothes={
    mint:`<path d="m118 213-18 17 12 49 11-9-3 45q38 12 77 0l-2-45 13 9 12-49-19-17-21 8h-40z" fill="#adc49d" ${s}/><path d="m138 219q21 16 42 0m-38 60h35m-55 25h75" fill="none" ${s}/><path d="m131 313-3 31h23l8-27 7 27h23l-3-31" fill="#e8e4d7" ${s}/><path d="m143 234-1 13m35-13 1 13" ${s}/>` ,
    suit:`<path d="m119 216-19 18 13 56 13-8-2 33h72l-2-33 12 8 12-56-18-18-21 3h-40z" fill="#66726c" ${s}/><path d="m143 220 17 18 16-18v90h-32z" fill="#faf8ec" ${s}/><path d="m158 235-6 11 7 42 8-41-6-12z" fill="#cf6f59" ${s}/><path d="m139 220-10 28 13 5-11 20m48-53 12 28-14 6 10 18" fill="none" ${s}/><path d="m129 314-1 31h23l9-22 7 22h23l-2-31" fill="#4d5950" ${s}/>` ,
    raincoat:`<path d="m128 213q-14-12-10-30 8-12 20-14h44q18 7 20 18 3 15-13 28l20 14 17 61-22 6-10-32 7 58h-84l7-58-12 32-22-6 19-61z" fill="#e8c95f" ${s}/><path d="M160 217v98m-28-57h18v20h-18zm38 0h18v20h-18z" fill="none" ${s}/><path d="m127 322-2 24h26l6-24m12 0 1 24h27l-5-24" fill="#d5b34e" ${s}/>` ,
    hoodie:`<path d="m129 215q-18-12-9-29l14-10h50l14 10q9 18-10 29l21 16 13 56-22 8-7-30 5 51h-76l5-51-8 30-21-8 14-56z" fill="#e6ddc7" ${s}/><path d="m135 217q25 18 50 0m-36 16-2 27m24-27 2 27m-33 20q20 14 40 0l-5 25h-30z" fill="none" ${s}/><path d="m129 316-2 30h25l8-24 7 24h25l-4-30" fill="#8fa9b7" ${s}/>` ,
    space:`<path d="m120 215-23 20-12 57 23 5 14-40-3 62h81l-3-62 14 40 23-5-13-57-24-20z" fill="#d6ded9" ${s}/><path d="m133 217 27 9 27-9v30h-54z" fill="#adbfbd" ${s}/><rect x="137" y="261" width="47" height="32" rx="5" fill="#f8f9ee" ${s}/><circle cx="147" cy="273" r="3" fill="#e09b60"/><path d="m156 273h17m-24 12h22" ${s}/><path d="m129 319-2 26h27l6-21 7 21h28l-4-26" fill="#bdcac4" ${s}/><path d="m114 252-17-4m125 0-17 4M125 310h72" fill="none" ${s}/>` ,
    apron:`<path d="m120 216-19 19 9 55 17-8-2 33h70l-2-33 17 8 10-55-20-19z" fill="#f9f8ef" ${s}/><path d="m137 216 3 36h39l4-36m-46 30-12 67q34 10 70 0l-13-67z" fill="#7e9974" ${s}/><path d="M142 280h34v23h-34zm-18-18h72" fill="none" ${s}/><path d="m128 316 2 30h23l7-24 6 24h23l1-30" fill="#555e53" ${s}/>` ,
    cape:`<path d="m119 216q-22 27-28 106l29-8 14 9 27-9 24 9 15-9 26 8q-6-80-27-106z" fill="#b6a6cd" ${s}/><path d="m139 222-14 91h71l-18-91" fill="#f2edde" ${s}/><path d="m143 218 17 12 19-12m-35 12 15 32 18-31m-43 85 1 30h20l7-23 7 23h21l-4-30" fill="none" ${s}/><circle cx="160" cy="232" r="5" fill="#ddba58" ${s}/>` ,
    tutu:`<path d="m121 215-20 17 10 42 15-7 7 8h52l9-8 16 7 10-42-21-17z" fill="#363b33" ${s}/><path d="m134 270-28 49q54 22 109 0l-28-49z" fill="#e6b7bd" ${s}/><path d="m141 278-9 43m24-43-1 47m17-47 6 46m3-46 15 44" stroke="#c78d9f" stroke-width="1.5" fill="none"/><path d="m135 329v17h20l5-16 6 16h22v-17" fill="#e7dfcc" ${s}/>`
  };
  return base+(clothes[id]||clothes.mint);
}
function headShape(id){
  const s=`stroke="${ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`;
  return ({
    none:'',
    headphones:`<path d="M104 172q-15-75 54-77 73-1 57 78" fill="none" stroke="#687b5b" stroke-width="10"/><rect x="97" y="151" width="14" height="32" rx="5" fill="#9cac8c" ${s}/><rect x="210" y="151" width="14" height="32" rx="5" fill="#9cac8c" ${s}/>` ,
    crown:`<path d="m115 103-5-40 30 17 20-29 21 29 30-17-5 40z" fill="#e7cd70" ${s}/><path d="m122 95h77" ${s}/><circle cx="160" cy="85" r="5" fill="#c18e66"/>`,
    hardhat:`<path d="M104 116q1-53 57-54 55 1 56 54z" fill="#e3c265" ${s}/><path d="m146 109 3-48h22l5 48m-78 7h125" fill="none" ${s}/>` ,
    halo:`<ellipse cx="160" cy="74" rx="48" ry="9" fill="none" stroke="#c9ab59" stroke-width="5"/><path d="m218 67 7-6m-8 17 9 3" fill="none" ${s}/>` ,
    duck:`<path d="M136 91q-4-16 7-23 12-3 20 7 23-2 28 8-8 19-47 16z" fill="#edcb59" ${s}/><path d="m145 70-13 3 13 8" fill="#cf8d51" ${s}/><circle cx="152" cy="75" r="2.2" fill="#333"/>`
  })[id]||'';
}
function propShape(id){
 const s=`stroke="${ink}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
 return ({
  coffee:`<path d="m227 252 6 53h29l6-53z" fill="#d9bd8c" ${s}/><path d="m246 251 4-30h11" fill="none" ${s}/><path d="m225 252h45m-36 16 26 22m-26 0 26-22" stroke="#f3f1dc" stroke-width="3"/>`,
  laptop:`<path d="m221 250 47-8 13 38-47 8z" fill="#b7c6c0" ${s}/><path d="m234 288 47-8-9 10-47 8z" fill="#e2e7dc" ${s}/><circle cx="250" cy="267" r="4" fill="#f7f8ef"/>`,
  sign:`<path d="m246 249 1 72" ${s}/><path d="m212 216 70-3 4 39-71 3z" fill="#eef1ce" ${s}/><text x="248" y="242" text-anchor="middle" font-size="18" fill="#556447" font-family="sans-serif">下班</text>`,
  fish:`<path d="M225 274q17-33 46-9l17-14-1 38-18-12q-27 25-44-3z" fill="#a7bac2" ${s}/><circle cx="237" cy="272" r="3" fill="#334238"/><path d="m251 259-4 27m10-27-4 27" fill="none" ${s}/>` ,
  umbrella:`<path d="M251 270V155" ${s}/><path d="M193 184q56-99 116 0l-23-5-19 9-20-11-22 10-13-8z" fill="#d7c285" ${s}/><path d="M251 131q-22 16-26 55m27-55q20 17 34 49m-35 90q0 24 15 11" fill="none" ${s}/>` ,
  spatula:`<path d="m236 294 18-47m-9-3 18-38q5-7 15-1 10 5 6 13l-21 35z" fill="#c7a575" ${s}/><path d="m261 216 8 4m-12 6 8 4" ${s}/>` ,
  flower:`<path d="m247 291-6-65m6 59 17-35m-18 18-15-25" fill="none" stroke="#7d9165" stroke-width="3"/><path d="m225 292 22 17 29-18-12-34-19 12-17-11z" fill="#eee4d1" ${s}/><g fill="#d89893" stroke="#a77874" stroke-width="1.5"><circle cx="242" cy="219" r="11"/><circle cx="236" cy="230" r="11"/><circle cx="249" cy="230" r="11"/><circle cx="263" cy="246" r="11"/><circle cx="229" cy="243" r="8"/></g><circle cx="243" cy="228" r="4" fill="#e9cc80"/>`,
  flag:`<path d="m241 300 2-127" ${s}/><path d="m244 176 46 7-5 34-42-6" fill="#c5b5d7" ${s}/><path d="m254 188 20 4m-20 7 13 3" stroke="#f9f5e7" stroke-width="2"/>`
 })[id]||'';
}
export function itemSvg(category,id){
 const shape=category==='outfit'?outfitShape(id):category==='head'?headShape(id):propShape(id);
 const view=category==='outfit'?'80 202 160 160':category==='head'?'87 43 150 152':id==='umbrella'?'185 122 130 190':'205 172 95 150';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" aria-hidden="true">${shape}</svg>`;
}
export function portraitSvg(look,{background=false}={}){
 const doll=look.style==='doll';
 const head=doll?`<path d="M98 137q-4-57 62-57 69 1 65 66-1 63-64 69-63-6-63-78z" fill="#edcbae" stroke="${ink}" stroke-width="2.5"/><path d="M96 149q-18-73 60-78 85-4 70 80l-14-23-8 17-16-27-16 8-21-13-21 22-11-7-15 26z" fill="#333a30"/><path d="m134 164 10-1m29 0 10 1" stroke="${ink}" stroke-width="4" stroke-linecap="round"/><path d="m154 181 13 0" stroke="#9d785e" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="125" cy="180" rx="10" ry="5" fill="#dfb4a1"/><ellipse cx="190" cy="180" rx="10" ry="5" fill="#dfb4a1"/>`:`<path d="M106 145q-4-46 49-49 59-6 61 55l4 88-22 17h-75l-20-20z" fill="#282f27"/><ellipse cx="141" cy="156" rx="6.5" ry="8.5" fill="#f7f8f0"/><ellipse cx="178" cy="156" rx="6.5" ry="8.5" fill="#f7f8f0"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 320 400" role="img" aria-label="${escapeXml(getItem('outfit',look.outfit).name)}">${background?'<rect width="320" height="400" fill="#f5f7ed"/>':''}<ellipse cx="161" cy="353" rx="79" ry="7" fill="#e0e5d5"/><path d="m139 306-3 38m45-38 4 38" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>${head}${outfitShape(look.outfit)}<path d="m131 344-13 5q-6 9 33 6l3-10m16 0-2 10q39 4 34-6l-15-5" fill="#f8f7ef" stroke="${ink}" stroke-width="2.5"/>${headShape(look.head)}${propShape(look.prop)}<path d="m213 268 11 8" stroke="${ink}" stroke-width="5" stroke-linecap="round"/></svg>`;
}
// The generated sheet has a 512 px first row and a 574 px second row.
// Use explicit crop rectangles instead of assuming two equal-height rows.
export function photoRect(outfit){const n=getItem('outfit',outfit).photo;return {x:(n%4)*362,y:n<4?0:512,width:362,height:n<4?512:574};}
export function photoMarkup(outfit){const r=photoRect(outfit);const image=new URL('../assets/real-looks.png',import.meta.url).href;return `<div class="photo-tile"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r.width} ${r.height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><image href="${image}" x="${-r.x}" y="${-r.y}" width="1448" height="1086"/></svg></div>`;}
