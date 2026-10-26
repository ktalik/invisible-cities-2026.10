import{A as e,At as t,Et as n,J as r,N as i,Q as a,W as o,Y as s,gt as c,h as l,p as ee,y as te}from"./three-C8zD7oKz.js";import{A as ne,Bt as re,O as ie,Ut as ae,Vt as u,X as oe,Y as se,Yt as ce,Z as d,_t as le,at as ue,et as f,g as p,i as de,rt as fe,s as m,tt as pe}from"./kit-rDGCj1kT.js";import{b as h,m as me,p as he}from"./cities-tyx6u3Ru.js";var g=11,_=4.3,v=2*_/3,y=2.6,b=(e,t,n)=>h(e*.7548+t*.5698+n*.3183+e*n*.1234),ge=`
uniform vec3 uPal[16];
uniform float uTime, uDark, uSlamT;
uniform vec3 uSlamP, uLantern;
float h1(vec3 i){ return fract(i.x*0.7548 + i.y*0.5698 + i.z*0.3183 + i.x*i.z*0.1234); }
// material ids: 0 dirt 1 clay 2 lime 3 roof 4 step 5 negative 6 sleeper 7 rockA 8 chalk 9 topsoil
// 10 foundation 11 bedrock 12 tunnel 13 root 14 door 15 rockB
int cityMat(vec3 p){
  if (p.y > -0.6) return 9;
  if (p.y > -4.0) {
    vec2 cell = floor((p.xz + 21.0) / 7.0);
    vec2 cc = (cell + 0.5) * 7.0 - 21.0 + (vec2(h1(vec3(cell.x, 1.0, cell.y)), h1(vec3(cell.y, 2.0, cell.x))) - 0.5) * 3.0;
    float cy = -2.6 + (h1(vec3(cell, 3.0)) - 0.5) * 1.0;
    vec3 q = (p - vec3(cc.x, cy, cc.y)) / vec3(1.5 + h1(vec3(cell.x, 4.0, cell.y)), 0.9, 1.4);
    float d = length(q) + 0.28 * snoise(p * 1.1);
    if (h1(vec3(cell, 5.0)) < 0.7 && d < 1.0 && p.y > cy - 0.35) return 8;
    float bnd = (p.y + 0.6) / 0.47 + 0.35 * snoise(p * vec3(0.12, 0.6, 0.12));
    return mod(floor(bnd), 2.0) < 1.0 ? 7 : 15;
  }
  if (p.y < -18.0) return 11;
  if (p.y < -14.5) return 10;
  // the grand stair and its negative
  if (p.z > 12.6 && p.z < 17.2 && p.x > -4.0 && p.x < 2.6) {
    float xr = p.x + 4.0, yr = p.y + 14.5;
    float k = floor(xr / 0.6), top = (k + 1.0) * 0.4;
    if (yr < top) return 4;
    if (yr < xr / 0.6 * 0.4 + 0.95) return 5;
    return 0;
  }
  vec2 bij = clamp(floor((p.xz - 2.5 + 16.5) / ${g}.0), 0.0, 2.0);
  vec2 l = p.xz - 2.5 - (-11.0 + ${g}.0 * bij);
  if (abs(l.x) > ${_} || abs(l.y) > ${_}) return (p.x > 2.6 && p.y < -10.1) ? 10 : 0;
  if (bij.x == 1.0 && bij.y == 1.0) {
    vec3 q = p - vec3(2.5, -9.0, 2.5);
    float dd = length(q);
    if (p.y > -9.0) return dd < 2.6 ? (dd > 2.3 ? 2 : 1) : 0;
    float wd = min(3.6 - abs(l.x), 3.0 - abs(l.y));
    if (wd < 0.0) return 0;
    if (wd < 0.3) return (abs(l.x) < 0.6 && p.y < -12.2 && l.y > 0.0) ? 14 : 2;
    if (fract((p.y + 14.5) / 2.75) * 2.75 < 0.15) return 2;
    return 1;
  }
  vec2 hij = clamp(floor((l + ${_}) / ${v.toFixed(5)}), 0.0, 2.0);
  vec2 hl = l + ${_} - (hij + 0.5) * ${v.toFixed(5)};
  bool upper = p.x - hl.x > 2.6;
  float base = upper ? -10.1 : -14.5;
  vec3 id = vec3(bij.x * 3.0 + hij.x, 0.0, bij.y * 3.0 + hij.y);
  float hs = h1(id);
  float storeys = upper ? 2.0 : (hs < 0.3 ? 2.0 : 3.0);
  float eave = base + storeys * ${y}, roofH = upper ? 0.9 : 1.2, hw0 = ${(v/2).toFixed(5)};
  float yr = p.y - base;
  if (yr < 0.0) return 10;
  vec2 a = abs(hl);
  if (p.y > eave) {
    float rs = eave + roofH * (1.0 - a.y / hw0);
    if (p.y < rs) return rs - p.y < 0.2 ? 3 : 1;
    return 0;
  }
  float wd = hw0 - max(a.x, a.y);
  float st = fract(yr / ${y}) * ${y};
  if (wd < 0.22) {
    float along = a.x > a.y ? hl.y : hl.x;
    if (yr < 1.8 && abs(along) < 0.38 && a.y > a.x && hl.y > 0.0) return 14;
    if (yr > ${y} && st > 0.9 && abs(along) < 0.32 && st < 1.7 + sqrt(max(0.0, 0.1024 - along * along))) return 1;
    return 2;
  }
  if (st < 0.15) return 2;
  float sto = floor(yr / ${y});
  float hs2 = h1(id + vec3(0.0, sto + 3.0, 0.0));
  if (hs2 < 0.5) {
    vec3 sp = vec3(hl.x - (hs2 - 0.25) * 1.4, st - 0.3, hl.y - (fract(hs2 * 7.0) - 0.5) * 1.2);
    if (length(vec3(max(abs(sp.x) - 0.38, 0.0), sp.y * 1.3, sp.z)) < 0.13) return 6;
  }
  return 1;
}
vec3 shadeCity(vec3 p, vec3 n){
  int m = cityMat(p);
  // tunnels and roots override soft materials
  float t1 = snoise(p * 0.33), t2 = snoise(p * 0.33 + 17.0);
  bool soft = m == 0 || m == 1 || m == 9 || m == 7 || m == 15 || m == 10;
  if (soft && abs(t1) < 0.03 && abs(t2) < 0.03) m = 12;
  if (p.y > -7.0 && soft) {
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      vec2 rc = vec2(-12.0 + fi * 6.5, -9.0 + mod(fi * 7.0, 15.0)) + vec2(snoise(vec3(p.y * 0.5, fi, 0.0)), snoise(vec3(p.y * 0.5, fi, 9.0))) * 1.2;
      float r = 0.09 * (1.0 + p.y / 8.0) + 0.02;
      float rd = length(p.xz - rc);
      float br = abs(snoise(vec3(p.xz * 0.6, fi * 3.0 + p.y * 0.3)));
      if (rd < r || (rd < 2.5 + p.y * 0.3 && br < 0.025)) m = 13;
    }
  }
  vec3 c = uPal[m];
  float g = snoise(p * 2.7) * 0.5 + snoise(p * 9.0) * 0.25;
  c *= 0.88 + 0.22 * g;
  if (m == 0) c *= 0.85 + 0.6 * step(0.93, fract(sin(dot(floor(p * 9.0), vec3(12.9, 78.2, 37.7))) * 43758.5));
  // light: cool raking moon
  vec3 L = normalize(vec3(0.42, 0.5, 0.76));
  float dif = max(dot(n, L), 0.0);
  c *= (0.2 + 0.95 * dif) * vec3(0.82, 0.88, 1.0);
  // beads of water sliding on the cut faces
  if (n.y < 0.5) {
    vec2 uv = vec2(n.z > 0.5 ? p.x : p.z, p.y) * vec2(1.4, 0.9);
    vec2 ce = floor(uv);
    float hh = fract(sin(dot(ce, vec2(41.3, 17.1))) * 9631.7);
    if (hh < 0.07) {
      vec2 bp = vec2(0.2 + 0.6 * fract(hh * 13.0), fract(hh * 7.0 - uTime * (0.015 + hh * 0.08)));
      float bd = length((fract(uv) - bp) * vec2(1.0, 0.65));
      c += vec3(0.75, 0.85, 1.0) * smoothstep(0.05, 0.0, bd) * 0.45;
    }
  } else {
    // the faint footpath and the listener's lantern
    float path = abs(p.z - 9.0 - 3.0 * sin(p.x * 0.18)) ;
    c *= 1.0 + 0.25 * smoothstep(0.7, 0.0, path) * step(p.x, 15.0);
    c += uPal[14] * 0.6 * exp(-pow(length(p.xz - uLantern.xz) / 1.2, 2.0));
  }
  c *= 1.0 - 0.96 * uDark;
  // the door slam: flash, a sound shell, and walls lit in its wake
  float d = distance(p, uSlamP), r = uSlamT * 6.0;
  bool str = m == 2 || m == 3 || m == 4 || m == 5 || m == 6 || m == 14 || m == 13;
  float fade = exp(-uSlamT * 0.12);
  float ring = exp(-pow((d - r) / 0.14, 2.0));
  float trail = d < r ? exp(-(r - d) * 0.9) : 0.0;
  vec3 amber = vec3(1.6, 0.85, 0.35);
  c += amber * fade * (ring * (0.45 + uDark) + trail * (str ? 1.3 + 2.0 * uDark : 0.06));
  c += amber * 2.5 * exp(-d * 2.5) * exp(-uSlamT * 2.5);
  return c;
}
`,x=h=>{let x=h.rng,S=new i,C=[];for(let e=0;e<3;e++)for(let t=0;t<3;t++)if(e!==1||t!==1)for(let n=0;n<3;n++)for(let r=0;r<3;r++){let i=-8.5+g*e-_+(n+.5)*v,a=-8.5+g*t-_+(r+.5)*v;if(a>12.6&&i>-4-v/2&&i<4.033333333333333)continue;let o=i>2.6,s=o?-10.1:-14.5,c=o||b(e*3+n,0,t*3+r)<.3?2:3;C.push({x:i,z:a,base:s,eave:s+c*y,rh:o?.9:1.2})}let w={uPal:{value:[`#3a2f24`,`#7b4931`,`#d5cab4`,`#8a8478`,`#e2d8c2`,`#5a1f1c`,`#efe8da`,`#4d5a6c`,`#e8e6e0`,`#3d3a2c`,`#5e564c`,`#2a2a2e`,`#0c0a08`,`#5a3a22`,`#f2c48d`,`#6a6478`].map(e=>new te(e))},uTime:ce.time,uDark:{value:0},uSlamT:{value:100},uSlamP:{value:new t},uLantern:{value:new t(12.6,0,9.4)}},_e=new c({uniforms:w,vertexShader:`
      varying vec3 vW; varying vec3 vN;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,fragmentShader:ae+ge+`
      varying vec3 vW; varying vec3 vN;
      void main() { gl_FragColor = vec4(shadeCity(vW, normalize(vN)), 1.0); }`}),T=new r(new ee(34,23,34).translate(0,-11.5,0),_e);S.add(T);let E=ne(f(fe(23.5,9,4),0,-23,0,{rx:Math.PI,ry:Math.PI/4}),.9,.35,5);le(E,(e,t,n,r)=>r.set(re(`#1e1c1e`,`#3a3430`,me((t+32)/9))));let D=new se;D.add(E,null,`stone`);for(let e=0;e<30;e++)ie(D,{x:x.float(-15.5,15.5),z:x.float(-15.5,12.5),r:x.float(.12,.4),color:`#6a645a`,rng:x,flat:.6});let O=9.4;D.add(f(pe(.12,.18,.1),12.75,0,O),`#4a3a2a`,`wood`),S.add(D.build({name:`surface`}));let k=de(`#f2c48d`,1.1,.9);k.position.set(12.75,.28,O),S.add(k);let A=new a({color:`#4a4e58`,roughness:.9,vertexColors:!0}),j=new r(p(.27),A);j.position.set(13.299999999999999,0,8.8),j.rotation.set(.12,-2.4,0),S.add(j);let M=new r(f(ue(.012,.012,.16,4),0,0,0,{rx:1}),A);M.position.set(13.219999999999999,.2,8.88),M.rotation.y=-2.4,S.add(M);let N=new i,P=new r(p(.26),new a({color:`#6a5a48`,roughness:.9,vertexColors:!0}));P.rotation.x=1.25,P.position.y=.04,N.add(P),N.position.set(12.5,0,9.55),N.rotation.y=.6,S.add(N);let F=f(fe(.025,.2,3),0,0,0),I=new a({color:`#ffffff`,roughness:1,vertexColors:!1});S.add(d(F,I,14e3,(e,t,n)=>{t.position.set(x.float(-16.9,16.9),0,x.float(-16.9,13)),t.rotation.set(x.float(-.35,.35),x.angle(),x.float(-.35,.35)),t.scale.setScalar(x.float(.6,1.5)),n.copy(u([`#5a5236`,`#6a6040`,`#4a4630`,`#7a6e4a`],x))},{castShadow:!1}));let L=2200,ve=Array.from({length:L},()=>[x.float(-16.9,16.9),x.float(13,16.9),x.angle(),x.float(.6,1.5)]),R=d(F,I,L,(e,t,n)=>{n.copy(u([`#5a5236`,`#6a6040`,`#4a4630`],x))},{castShadow:!1});S.add(R);let z=oe(R),B=[],V=(e,t)=>B.push(...e,...t);for(let e of C){let t=v/2-.05,n=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([n,r])=>[e.x+n*t,e.z+r*t]);for(let t=0;t<4;t++){let[r,i]=n[t],[a,o]=n[(t+1)%4];V([r,e.base,i],[a,e.base,o]),V([r,e.eave,i],[a,e.eave,o]),V([r,e.base,i],[r,e.eave,i])}for(let n of[-1,1])for(let r of[-1,1])V([e.x+n*t,e.eave,e.z+r*t],[e.x+n*t,e.eave+e.rh,e.z]);V([e.x-t,e.eave+e.rh,e.z],[e.x+t,e.eave+e.rh,e.z]),V([e.x-.38,e.base,e.z+t],[e.x-.38,e.base+1.8,e.z+t]),V([e.x+.38,e.base,e.z+t],[e.x+.38,e.base+1.8,e.z+t]),V([e.x-.38,e.base+1.8,e.z+t],[e.x+.38,e.base+1.8,e.z+t]),b(e.x,7,e.z)<.5&&V([e.x-.25,e.base+.24,e.z],[e.x+.25,e.base+.24,e.z])}for(let e=0;e<11;e++)for(let t of[12.6,14.8,16.9])V([-4+e*.6,-14.5+e*.4,t],[-4+e*.6,-14.1+e*.4,t]),V([-4+e*.6,-14.1+e*.4,t],[-3.4+e*.6,-14.1+e*.4,t]);V([-4,-13.55,14.8],[2.6,-9.15,14.8]);for(let e=0;e<24;e++){let t=e/24*Math.PI*2,n=(e+1)/24*Math.PI*2;for(let e of[0,.5,1]){let r=2.45*Math.cos(e),i=-9+2.45*Math.sin(e);V([2.5+Math.cos(t)*r,i,2.5+Math.sin(t)*r],[2.5+Math.cos(n)*r,i,2.5+Math.sin(n)*r])}}let H=new l;H.setAttribute(`position`,new e(B,3));let U={uSlamP:w.uSlamP,uSlamT:w.uSlamT,uOn:{value:0}},ye=new c({uniforms:U,vertexShader:`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
      uniform vec3 uSlamP; uniform float uSlamT, uOn; varying vec3 vW;
      void main(){
        float d = distance(vW, uSlamP), r = uSlamT * 6.0;
        float a = (exp(-pow((d - r) / 0.5, 2.0)) * 1.4 + (d < r ? exp(-(r - d) * 0.15) * 0.8 : 0.0)) * exp(-uSlamT * 0.06) + 0.06;
        gl_FragColor = vec4(vec3(1.0, 0.62, 0.28) * 1.6, a * uOn);
      }`,transparent:!0,depthTest:!1,depthWrite:!1,blending:2}),W=new o(H,ye);W.frustumCulled=!1,W.renderOrder=10,S.add(W);let G=new s({color:`#c8b48a`,transparent:!0,opacity:0,depthWrite:!1,blending:2}),K=new r(new n(1,.05,4,64).rotateX(Math.PI/2),G);K.visible=!1,S.add(m({count:260,center:[0,.6,0],radius:22,y0:.05,y1:1.4,color:`#8a94a8`,size:.22,opacity:.12,swirl:1.2,twinkle:.2,rng:x.fork(`mist`)}));let q=m({count:90,center:[0,-11.5,15],radius:16,y0:-23,y1:0,color:`#6a4a32`,size:.05,opacity:.8,velocity:[0,-.6,0],rng:x.fork(`crumbs`)});S.add(q);let J=C.map(e=>new t(e.x,e.base+.9,e.z+v/2)),Y=[],X=2.2;for(let e=0;e<60;e++)Y.push({t:X,p:x.pick(J)}),X+=x.float(7,15);let Z=X,Q=new he(.4),$=(e,t)=>{Q.update(t);let n=Q.value,r=15+2*Math.cos(e/90*Math.PI*2);T.scale.z=(r+17)/34,T.position.z=(r-17)/2,q.position.z=r-15;for(let e=0;e<L;e++){let[t,n,i,a]=ve[e];z(e,t,0,n,i,n<r-.05?a:0)}z.done();let i,a;if(n>.5){let t=Math.floor(e/4.5);i=e-t*4.5,a=J[Math.floor(b(t,3,1)*J.length)%J.length]}else{let t=e%Z,n=Y[Y.length-1],r=Y[Y.length-1].t-Z;for(let e of Y)e.t<=t&&(n=e,r=e.t);i=t-r,a=n.p}w.uSlamT.value=i,w.uSlamP.value.copy(a),w.uDark.value=n,U.uOn.value=n,W.visible=n>.01;let o=i*6,s=o>-a.y?Math.sqrt(o*o-a.y*a.y):0;K.position.set(a.x,.06,a.z),K.scale.setScalar(Math.max(.01,s)),G.opacity=s>0&&s<26?.35*Math.exp(-s*.08):0;let c=Math.hypot(12.6-a.x,-a.y,O-a.z)/6,l=Math.exp(-(((i-c)/.25)**2));N.rotation.z=l*.15,k.material.opacity=.9*(.85+.15*Math.sin(e*9)*Math.sin(e*5.3))};return $(0,0),{root:S,env:{skyTop:`#0a0d13`,skyHorizon:`#252b37`,skyBottom:`#0c0f14`,fog:`#14181f`,fogNear:70,fogFar:200,sunDir:[.42,.5,.76],sunColor:`#b8c4dc`,sunIntensity:1.1,sunDisc:0,sunGlow:.2,moon:{dir:[-.6,.18,-.8],size:1.6,color:`#e8e4d8`},hemiSky:`#4a5468`,hemiGround:`#2a2620`,hemiIntensity:.6,envIntensity:.5,stars:0,clouds:.1,cloudColor:`#3a4050`,bloomStrength:.8,bloomThreshold:.8,bloomRadius:.5,vignette:.5,tiltShift:.25,shadowRadius:26,saturation:1},camera:{position:[40.3,10.5,40.3],target:[0,-8,0],fov:35,minDistance:10,maxDistance:80,autoRotate:0,views:[{position:[22,20,34],target:[0,-6,0]},{position:[9,-9.5,26],target:[2,-11.5,15]}]},interaction:{label:`Ear to the Ground`,activeLabel:`Look again`,hint:`In the dark, only a door slamming somewhere below draws the city.`,set:e=>Q.set(e),camera:{position:[16,2.8,13],target:[0,-8,-1]}},update:$}};export{x as default};