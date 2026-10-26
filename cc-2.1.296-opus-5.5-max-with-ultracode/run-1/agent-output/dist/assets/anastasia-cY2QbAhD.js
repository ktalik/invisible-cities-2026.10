import{A as e,At as t,E as n,G as r,I as i,J as a,N as o,Q as s,R as c,S as l,W as u,Y as d,_t as f,at as p,et as m,gt as h,h as g,jt as _,kt as v,m as y,nt as ee,ot as b,tt as te,v as ne,w as re,y as ie,z as ae}from"./three-C8zD7oKz.js";import{A as oe,B as se,Bt as ce,Et as x,Ht as le,Kt as ue,Mt as de,N as fe,O as pe,Ut as me,Vt as he,Y as ge,Yt as S,Z as C,_t as _e,at as w,bt as ve,d as ye,et as T,ft as be,g as xe,gt as E,k as Se,kt as Ce,l as we,lt as Te,n as Ee,ot as De,p as Oe,pt as D,rt as ke,s as Ae,tt as O,ut as je,zt as k}from"./kit-rDGCj1kT.js";import{c as Me,g as Ne,p as Pe,w as Fe,y as Ie}from"./cities-tyx6u3Ru.js";var A=Math.PI*2,Le=e=>1+.018*Math.sin(2*e+.6)+.012*Math.sin(3*e+2.2)+.006*Math.sin(5*e+4.1),Re=`float lobe(float a){ return 1.0 + 0.018*sin(2.0*a+0.6) + 0.012*sin(3.0*a+2.2) + 0.006*sin(5.0*a+4.1); }`,ze=22.5,Be=1.6,Ve=[[3.4,4.4],[8.2,9.2],[13.2,14.2],[19,20.2]],He=[[Be,3.4],[4.4,8.2],[9.2,13.2],[14.2,19],[20.2,22.38]],Ue=-.13,We=2.4,Ge=.42,Ke=.86,qe=68,j=e=>{let t=new ie(e);return`vec3(${t.r.toFixed(4)}, ${t.g.toFixed(4)}, ${t.b.toFixed(4)})`},M={milk:`#efe6d6`,milk2:`#ddcfb8`,honey:`#dca85e`,honey2:`#c4873a`,carn:`#c95a2c`,carn2:`#9c3d1f`,blue:`#a6b7c4`,blue2:`#7f95a8`,onyx:`#1f1b1c`,slate:`#64788b`,lawn:`#7f9d55`,lawn2:`#a3b86c`,chryso:`#74c7a2`,saffron:`#f0a63a`,kcarn:`#d9612f`,kmilk:`#f6efe2`,kblue:`#9fc3dd`,konyx:`#2b2627`,cherry:`#7b3a2b`,pheasant:`#c9862e`,stoneG:`#8f8579`},Je=Je=>{let N=Je.rng,Ye=Je.quality!==`low`,P=new o,F=new t(Math.sin(Ge)*Math.cos(Ke),Math.sin(Ke),Math.cos(Ge)*Math.cos(Ke)),I=Math.atan2(F.z,F.x),L=I+Math.PI/8,R=new v(-F.x,-F.z).normalize().rotateAround(new v,-.7),Xe=Math.atan2(-R.x,-R.y),Ze=(e,t)=>{let n=A/8,r=((e-L)%n+n)%n;return r=Math.min(r,n-r),r*t},z=(e,t)=>{let n=e*Le(t);return[Math.cos(t)*n,Math.sin(t)*n]},B={uWake:{value:0},uPool:{value:new _(0,0,0,1)},uPoolK:{value:0},uVeil:{value:.42}},Qe=`
    uniform float uWake, uPoolK, uVeil;
    uniform vec4 uPool;
    float desireAt(vec3 p) {
      float d = length(p - uPool.xyz);
      float pool = uPoolK * (1.0 - smoothstep(uPool.w * 0.3, uPool.w, d));
      return clamp(max(pool, uWake), 0.0, 1.0);
    }
    vec3 veil(vec3 c, float k) {
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      vec3 o = mix(vec3(l) * vec3(1.04, 1.0, 0.94), c, mix(uVeil, 1.1, k));
      o = mix(o, vec3(l) * 0.84 + vec3(0.045, 0.042, 0.038), (1.0 - k) * 0.18);
      return o * mix(vec3(1.0), vec3(1.07, 1.02, 0.93), k);
    }
  `,V=(e,t)=>(e.onBeforeCompile=e=>{Object.assign(e.uniforms,B,t.uniforms??{});let n=e.vertexShader.replace(`#include <common>`,`#include <common>
varying vec3 vDW;
`+(t.vertPars??``)).replace(`#include <begin_vertex>`,`#include <begin_vertex>
`+(t.vertMain??``)).replace(`#include <project_vertex>`,`#include <project_vertex>
          { vec4 dwp = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              dwp = instanceMatrix * dwp;
            #endif
            vDW = (modelMatrix * dwp).xyz; }`);t.colorVert&&(n=n.replace(`#include <color_vertex>`,t.colorVert)),e.vertexShader=n;let r=e.fragmentShader.replace(`#include <common>`,`#include <common>
varying vec3 vDW;
`+Qe+(t.fragPars??``));t.colorFrag&&(r=r.replace(`#include <color_fragment>`,`#include <color_fragment>
`+t.colorFrag)),t.roughFrag&&(r=r.replace(`#include <roughnessmap_fragment>`,`#include <roughnessmap_fragment>
`+t.roughFrag)),t.normalFrag&&(r=r.replace(`#include <normal_fragment_maps>`,`#include <normal_fragment_maps>
`+t.normalFrag)),r=r.replace(`#include <opaque_fragment>`,`{ float dk = desireAt(vDW);
           ${t.preOut??``}
           outgoingLight = veil(outgoingLight, dk);
           ${t.glow?`outgoingLight *= mix(0.4, 1.6, dk);`:``} }
         #include <opaque_fragment>`),e.fragmentShader=r},e.customProgramCacheKey=()=>`anastasia|`+t.key,e),$e={matte:{roughness:.95},plaster:{roughness:.9},stone:{roughness:.8},wood:{roughness:.72},cloth:{roughness:.95,side:2},ceramic:{roughness:.35},polished:{roughness:.15,envMapIntensity:1.3},metal:{roughness:.35,metalness:.9},gold:{roughness:.26,metalness:1,envMapIntensity:1.4},silver:{roughness:.2,metalness:1,envMapIntensity:1.4},bronze:{roughness:.42,metalness:.85}},et={},tt=e=>{let t=et[e];if(t)return t;let n;return e===`glow`?(n=V(new d({vertexColors:!0}),{key:`glow`,glow:!0}),n.userData.unlit=!0):e===`ghost`?(n=V(new d({vertexColors:!0,transparent:!0,opacity:.35,depthWrite:!1,side:2}),{key:`ghost`,glow:!0}),n.userData.unlit=!0):e===`glass`?(n=V(new s({vertexColors:!0,roughness:.05,metalness:.1,transparent:!0,opacity:.3,depthWrite:!1,side:2,envMapIntensity:1.6}),{key:`lit`}),n.userData.unlit=!0):n=V(new s({vertexColors:!0,...$e[e]}),{key:`lit`}),et[e]=n,n};class nt extends ge{add(e,t,n=`matte`,r=1){return t!==null&&E(e,t,r),this.addWith(e,tt(n))}}let rt=(e,t,n=!0)=>{let r=e.build({name:t,castShadow:n});return r.traverse(e=>{let t=e;t.isMesh&&t.material.userData.unlit&&(t.castShadow=!1,t.receiveShadow=!1)}),r},H=V(new s({vertexColors:!0,roughness:.9}),{key:`lit`}),U=(e,t,n)=>{let r=e.length,i=t+1,a=new Float32Array(r*i*3),o=0;for(let i=0;i<r;i++){let[r,s]=e[i];for(let e=0;e<=t;e++){let i=e/t*A,c=r*Le(i),l=Math.cos(i)*c,u=Math.sin(i)*c,d=s;n&&([l,d,u]=n(l,s,u)),a[o++]=l,a[o++]=d,a[o++]=u}}let s=[];for(let e=0;e<r-1;e++)for(let n=0;n<t;n++){let t=e*i+n,r=t+1,a=t+i,o=a+1;s.push(t,r,a,r,o,a)}let c=new g;return c.setAttribute(`position`,new y(a,3)),c.setIndex(s),c.computeVertexNormals(),c},it=e=>{let t=e.attributes.normal;for(let e=0;e<t.count;e++)t.setXYZ(e,0,1,0);return e},W=[];for(let[e,t]of He)W.push(it(U([[e,0],[t,0]],360)));for(let[e,t]of Ve)W.push(U([[e,0],[e,-.42]],360)),W.push(it(U([[e,-.42],[t,-.42]],360))),W.push(U([[t,-.42],[t,0]],360));W.push(U([[Be,0],[Be,-.32]],160)),W.push(it(U([[0,-.32],[Be,-.32]],160))),W.push(U([[22.38,0],[ze,-.12]],512)),W.push(U([[ze,-.12],[ze,-2.4]],512));{let e=[];for(let t=0;t<=16;t++){let n=t/16;e.push([ze*Math.cos(n*Math.PI/2)**.62,-2.4-n*7.2])}W.push(U(e,256,(e,t,n)=>{let r=Math.min(1,(-t-We)/1.6),i=1+.06*ue(e*.11,t*.22,n*.11)*r;return[e*i,t+.35*ue(e*.2+5,t*.1,n*.2)*r,n*i]}))}let at=`
    ${Re}
    const float PI8 = 0.39269908;
    vec3 bandsOf(float w, vec3 a, vec3 b, vec3 c, vec3 ln, float f, float s) {
      float x = w * f + s;
      float t1 = 0.5 + 0.5 * sin(x);
      float t2 = 0.5 + 0.5 * sin(x * 2.31 + 1.7);
      vec3 col = mix(a, b, smoothstep(0.2, 0.8, t1));
      col = mix(col, c, smoothstep(0.62, 0.92, t2) * 0.7);
      float l = smoothstep(0.95, 0.993, 0.5 + 0.5 * sin(x * 0.53 + 2.0));
      return mix(col, ln, l * 0.9);
    }
    vec3 agate(vec3 p, out float rough) {
      float r = length(p.xz);
      float ang = atan(p.z, p.x);
      float rho = r / lobe(ang);
      float n1 = snoise(vec3(p.xz * 0.19, 1.3));
      float n2 = snoise(vec3(p.xz * 0.83, 5.1));
      float w = rho + n1 * 0.16 + n2 * 0.04;
      rough = 0.55;
      vec3 col;
      if (p.y < -0.02) {
        if (rho > ${22.25.toFixed(2)}) {
          float yy = -p.y + 0.16 * sin(ang * 3.0 + 1.0) + 0.12 * n1 + 0.03 * n2;
          col = bandsOf(yy, ${j(M.carn)}, ${j(M.honey)}, ${j(M.milk)}, ${j(M.onyx)}, 5.4, 0.4);
          col = mix(col, ${j(M.blue2)}, smoothstep(0.55, 0.95, 0.5 + 0.5 * sin(yy * 1.7 + 0.8)) * 0.6);
          rough = 0.3;
          if (p.y < -${We.toFixed(2)} + 0.05) {
            float t = clamp((-p.y - ${We.toFixed(2)}) / 5.5, 0.0, 1.0);
            col = mix(col * 0.82, ${j(`#5e4636`)} * (0.8 + 0.3 * n2), 0.45 + 0.5 * t);
            rough = 0.9;
          }
          return col;
        }
        if (rho < ${1.6500000000000001.toFixed(2)}) {
          return mix(${j(`#d6eadf`)}, ${j(`#8fcdb0`)}, smoothstep(0.35, 0.65, 0.5 + 0.5 * sin(rho * 10.0 + n2 * 2.0)));
        }
        rough = 0.45;
        return p.y < -0.3 ? mix(${j(`#2d5b49`)}, ${j(`#1f3f35`)}, 0.5 + 0.5 * n1) : ${j(M.onyx)};
      }
      float av = mod(ang - ${L.toFixed(5)} + PI8, 2.0 * PI8) - PI8;
      float avd = abs(av) * r;
      if (rho < 3.4) {
        col = mix(${j(M.lawn)}, ${j(M.lawn2)}, 0.5 + 0.5 * snoise(vec3(p.xz * 1.7, 9.0)));
        rough = 0.92;
        if (rho < 2.15 || rho > 3.24 || avd < 0.24) {
          col = mix(${j(M.milk)}, ${j(M.milk2)}, 0.5 + 0.5 * sin(w * 24.0));
          rough = 0.5;
        }
      } else if (rho < 8.2) {
        col = bandsOf(w, ${j(M.carn)}, ${j(M.carn2)}, ${j(M.honey)}, ${j(M.milk)}, 4.4, 0.0);
      } else if (rho < 13.2) {
        col = bandsOf(w, ${j(M.honey)}, ${j(M.honey2)}, ${j(M.milk)}, ${j(M.carn)}, 4.0, 1.3);
      } else if (rho < 19.0) {
        col = bandsOf(w, ${j(M.blue)}, ${j(M.blue2)}, ${j(M.milk)}, ${j(M.slate)}, 3.6, 2.1);
      } else {
        col = bandsOf(w, ${j(M.milk)}, ${j(M.milk2)}, ${j(M.blue)}, ${j(M.honey)}, 6.0, 0.7);
      }
      if (rho > 3.4 && rho < 20.2) {
        col = mix(col, ${j(M.milk)}, smoothstep(0.5, 0.44, avd) * 0.55);
        col = mix(col, ${j(M.onyx)}, smoothstep(0.035, 0.0, abs(avd - 0.47)) * 0.7);
      }
      float e = abs(rho - ${22.36.toFixed(2)});
      e = min(e, abs(rho - 3.4)); e = min(e, abs(rho - 4.4));
      e = min(e, abs(rho - 8.2)); e = min(e, abs(rho - 9.2));
      e = min(e, abs(rho - 13.2)); e = min(e, abs(rho - 14.2));
      e = min(e, abs(rho - 19.0)); e = min(e, abs(rho - 20.2));
      col = mix(col, ${j(M.milk)}, smoothstep(0.17, 0.12, e) * 0.85);
      col = mix(col, ${j(M.onyx)}, smoothstep(0.08, 0.06, e));
      return col;
    }
  `,ot=V(new s({roughness:.55,metalness:0,side:2,envMapIntensity:.85}),{key:`agate`,fragPars:me+at,colorFrag:`float agR; diffuseColor.rgb = agate(vDW, agR);`,roughFrag:`roughnessFactor = agR;`}),st=new a(D(W),ot);st.castShadow=!0,st.receiveShadow=!0,st.name=`agate`,P.add(st);let ct=Array.from({length:6},()=>new t),lt=V(new s({color:`#4dae89`,roughness:.06,metalness:.02,transparent:!0,opacity:.8,envMapIntensity:1.2}),{key:`water`,uniforms:{uTime:S.time,uBath:{value:ct}},fragPars:me+`uniform float uTime; uniform vec3 uBath[6];`,normalFrag:`{
        vec2 wp = vDW.xz * 0.75; float t = uTime * 0.4; float e = 0.07;
        float h0 = snoise(vec3(wp, t)) + 0.5 * snoise(vec3(wp * 2.7, t * 1.6));
        float hx = snoise(vec3(wp + vec2(e, 0.0), t)) + 0.5 * snoise(vec3((wp + vec2(e, 0.0)) * 2.7, t * 1.6));
        float hz = snoise(vec3(wp + vec2(0.0, e), t)) + 0.5 * snoise(vec3((wp + vec2(0.0, e)) * 2.7, t * 1.6));
        vec2 g = vec2(hx - h0, hz - h0) / e * 0.2;
        if (dot(vDW.xz, vDW.xz) < 3.2) {
          for (int i = 0; i < 6; i++) {
            vec2 d = vDW.xz - uBath[i].xz; float r = length(d) + 1e-4;
            g += d / r * cos(r * 40.0 - uTime * 5.0 - float(i) * 1.7) * exp(-r * 3.4) * uBath[i].y;
          }
        }
        vec3 nW = normalize(vec3(-g.x, 1.0, -g.y));
        normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
      }`,preOut:`outgoingLight += vec3(0.07, 0.12, 0.09) * dk;`});{let e=Ve.map(([e,t])=>it(U([[e,Ue],[t,Ue]],360)));e.push(it(U([[0,-.075],[Be,-.075]],160)));let t=new a(D(e),lt);t.receiveShadow=!0,t.name=`water`,P.add(t)}let G=new nt,ut=(e,t,n)=>{let r=t*Le(e),i=n*Le(e),a=i-r,o=.24,s=a+o*2,c=.21,l=.6,u=(r+i)/2,d=Math.cos(e),p=Math.sin(e);fe(G,{from:[d*(r-o),0,p*(r-o)],to:[d*(i+o),0,p*(i+o)],width:l,rise:0,hump:c,color:M.milk,finish:`stone`,rails:!0});let m=e=>c*(1-(2*e/s)**2)-.06,h=a/2+.03,g=new f;g.moveTo(-h,-.42),g.lineTo(h,-.42);for(let e=0;e<=12;e++){let t=h-e/12*2*h;g.lineTo(t,m(t))}g.lineTo(-h,-.42);let _=a*.64,v=-.1,y=Math.max(.06,m(0)-v-.07),b=new ee;b.moveTo(-_/2,-.42+.02),b.lineTo(-_/2,v),b.absellipse(0,v,_/2,y,Math.PI,0,!0),b.lineTo(_/2,-.42+.02),b.lineTo(-_/2,-.42+.02),g.holes.push(b),G.add(T(Te(g,l*.9,8),d*u,0,p*u,{ry:-e}),M.milk2,`stone`)};for(let e=0;e<8;e++){let t=L+e*A/8;for(let[e,n]of Ve)ut(t,e,n)}let dt=(e,t,n,r,i,a,o,s=.55,c=.06)=>{let l=N.float(0,.3/e),u=l+A-.35/e;for(;l<u;){let u=N.float(.5,.9),d=l+u/2/e;if(l+=(u+N.float(.03,.08))/e,Ze(d,e)<s+u/2||N.chance(c))continue;let[f,p]=z(e,d),m=N.float(a,o),h=t*N.float(.82,1),g=n?-d-Math.PI/2:-d+Math.PI/2,_=he(r,N,.01,.04,.035),v=he(i,N,.01,.04,.035);se(G,{x:f,z:p,ry:g,w:u,d:h,h:m,roof:`flat`,wall:_,roofColor:v,windowColor:`#3a302b`,rng:N});let y=-Math.sin(g),ee=-Math.cos(g);if(N.chance(.32)){let e=h*.22;se(G,{x:f+y*e,z:p+ee*e,y:m+.08,ry:g,w:u*N.float(.45,.62),d:h*.5,h:N.float(.26,.36),roof:`flat`,wall:_,roofColor:v,windowColor:`#3a302b`,door:!1,rng:N})}else N.chance(.3)&&(G.add(T(O(u+.08,.06,.03),f-h/2*y,m+.08,p-h/2*ee,{ry:g}),_,`plaster`),G.add(T(x(.05,6,5),f+N.float(-.2,.2)*u,m+.13,p,{s:[1,.8,1]}),k(`#6f8f4a`,N),`matte`))}},ft=[`#d98a5f`,`#c9714a`,`#e3a27a`,`#d47e62`,`#e8b48e`],pt=[`#b5562f`,`#a84b2a`,`#c4683d`,`#b9603a`],mt=[`#e3b46a`,`#d9a65c`,`#ecc787`,`#d49a52`,`#efd29a`],ht=[`#c98b3a`,`#b9792f`,`#d79a48`];dt(4.8,.55,!1,ft,pt,.5,.85),dt(7.88,.55,!0,ft,pt,.5,.9),dt(9.68,.62,!1,mt,ht,.5,.9),dt(12.82,.62,!0,mt,ht,.55,.9),dt(18.42,.8,!0,[`#b8c4cc`,`#a7b5c0`,`#cfd6db`,`#9fb0bd`,`#dfe3e3`],[`#7f93a6`,`#71879b`,`#8ea0b0`],.5,.85),G.add(be([[1.58,-.1],[1.62,.1],[1.8,.1],[1.82,0]],96),M.milk,`polished`);let gt=[];for(let e=0;e<8;e++){for(let t of[-.27,.27]){let[n,r]=z(2.72,L+(e+.5)*(A/8)+t);Se(G,{x:n,z:r,kind:`round`,h:N.float(1.15,1.45),color:`#4f7a3c`,rng:N});for(let e=0;e<7;e++){let e=N.angle(),t=N.float(.65,1.05);G.add(T(x(.035,6,4),n+Math.cos(e)*.3,t,r+Math.sin(e)*.3),`#f29a2e`,`ceramic`)}}for(let t=0;t<26;t++){let t=L+(e+N.float(.2,.8))*(A/8),n=N.float(2.3,3.15),[r,i]=z(n,t);Ze(t,n)<.3||gt.push([r,.04,i])}let t=L+(e+.5)*(A/8),[n,r]=z(1.98,t);G.add(T(O(.36,.05,.1),n,.1,r,{ry:-t+Math.PI/2}),M.milk2,`stone`),G.add(T(O(.3,.1,.06),n,0,r,{ry:-t+Math.PI/2}),M.milk2,`stone`)}let _t=[`#e0475a`,`#f2c14e`,`#f5f0e6`,`#d9608f`,`#ef7d3c`];for(let e of gt)G.add(T(x(.04,5,4),e[0],e[1],e[2],{s:[1,.7,1]}),N.pick(_t),`matte`);for(let e=0;e<8;e++){let t=L+A/8*e+.13,n=L+(e+1)*(A/8)-.13;for(let e=0;e<10;e++){let r=t+(e+.5)/10*(n-t),[i,a]=z(3.3,r);G.add(T(O(.36,.16,.12),i,0,a,{ry:-r+Math.PI/2}),k(`#4d6e3a`,N,.01,.03,.03),`matte`)}}let vt=[],yt=[],bt=[],xt=[`#8e2c25`,`#2f3f6b`,`#a8742c`,`#5b2a4a`,`#2e5a4c`],St=(e,t,n,r,i,a)=>{for(let o=0;o<i;o++){let i=a*Math.sqrt(N.next()),o=N.angle(),s=N.float(.032,.05),c=(1-i/a)*a*.9*N.float(.5,1);vt.push({x:e+Math.cos(o)*i,y:n+c+s*.4,z:t+Math.sin(o)*i,s,kind:N.chance(.15)?N.int(0,3):r,rx:N.angle(),ry:N.angle()})}},K=(e,t,n,r,i)=>[e+Math.cos(n)*r-Math.sin(n)*i,t+Math.sin(n)*r+Math.cos(n)*i];for(let e=0;e<8;e++)for(let t=0;t<5;t++){let n=L+(e+(t+1)/6)*(A/8),[r,i]=z(6.3,n);yt.push({a:n,x:r,z:i});let a=-n;for(let e of[-.3,.3])for(let t of[-.28,.28])G.add(J(r,i,n,e,t,0,w(.014,.016,.56,5)),`#4b3a2c`,`wood`);for(let e=0;e<4;e++){let a=je(.19,.62,.2,.05);G.add(J(r,i,n,-.285+e*.19,0,.56,a),e%2?M.milk:t%2?`#c4512a`:`#d9612f`,`cloth`)}G.add(J(r,i,n,0,0,0,O(.5,.28,.24)),`#6e4b33`,`wood`);let o=(e*5+t)%4;for(let e of[-.13,.13]){let[t,a]=K(r,i,n,e,0);G.add(T(w(.07,.055,.06,8),t,.28,a),`#a9824e`,`wood`),St(t,a,.33,(o+ +(e>0))%4,6,.055)}{let[e,t]=K(r,i,n,-.56,0),s=N.pick(xt);G.add(T(O(.36,.012,.6),e,0,t,{ry:a}),s,`cloth`),G.add(T(O(.28,.012,.5),e,.004,t,{ry:a}),ce(s,`#e8d6b0`,.35),`cloth`);for(let e=0;e<2;e++){let[t,a]=K(r,i,n,-.56+N.float(-.05,.05),-.13+e*.26);St(t,a,.016,(o+e*2)%4,Ye?12:7,.085)}}{let[e,s]=K(r,i,n,-.42,.24*(t%2?1:-1));G.add(T(w(.008,.008,.3,4),e,0,s,{rx:.15,ry:a}),`#4b3a2c`,`wood`),bt.push({x:e,z:s,a:n,q:(o+1)%4,r:N.float(.1,.13)})}}let q=[],Ct=[],wt=[];for(let e=0;e<8;e++)for(let t=0;t<3;t++){let n=L+(e+(t+1)/4)*(A/8),[r,i]=z(10.75,n);q.push({x:r,z:i,a:n,seed:N.float(0,100)});let a=-n;G.add(T(be([[.3,0],[.31,.1],[.26,.12],[.22,.03]],18),r,0,i),k(M.stoneG,N),`stone`),G.add(T(De(.23,14),r,.035,i),`#ff6a22`,`glow`,1.8);for(let e=0;e<3;e++){let t=e/3*Math.PI+N.float(-.2,.2);G.add(T(w(.022,.022,.34,6),r,.06,i,{rz:Math.PI/2,ry:t}),M.cherry,`wood`)}for(let e of[-.36,.36]){let[t,o]=K(r,i,n,0,e);G.add(T(w(.012,.014,.42,5),t,0,o),`#3a2c24`,`wood`),G.add(T(O(.05,.05,.012),t,.42,o,{ry:a}),`#3a2c24`,`wood`)}{let[e,t]=K(r,i,n,0,-.42),[a,o]=K(r,i,n,0,.42);G.add(Ce([e,.43,t],[a,.43,o],.006,5),`#2a2420`,`metal`)}{let[e,t]=K(r,i,n,-.05,.62);for(let r=0;r<6;r++){let i=r<3?0:r<5?1:2,[o,s]=K(e,t,n,(r-(i===0?1:i===1?3.5:5))*.055,0);G.add(T(w(.026,.026,.26,6),o,.026+i*.045,s,{rx:Math.PI/2,ry:a}),k(M.cherry,N,.01,.05,.05),`wood`)}}for(let e of[-.6,-.72]){let[t,a]=K(r,i,n,-.2,e);G.add(T(w(.05,.035,.08,8),t,0,a),`#b0603c`,`ceramic`),G.add(T(x(.06,7,5),t,.11,a,{s:[1,.8,1]}),k(`#6d8f45`,N),`matte`)}{let[e,t]=K(r,i,n,-.38,-.2);wt.push([e,0,t])}{let[e,t]=z(11.8,n);for(let r of[-.38,.38])for(let i of[-.62,.62]){let[a,o]=K(e,t,n,r,i);G.add(T(w(.02,.022,.62,5),a,0,o),`#5a4332`,`wood`)}for(let r of[-.62,.62])G.add(J(e,t,n,0,r,.6,O(.84,.03,.04)),`#5a4332`,`wood`);for(let r=0;r<7;r++)G.add(J(e,t,n,-.36+r*.12,0,.635,O(.03,.025,1.34)),`#6a5038`,`wood`);for(let r=0;r<7;r++){let[r,i]=K(e,t,n,N.float(-.38,.38),N.float(-.6,.6));G.add(T(oe(x(.13,7,5),.04,6,N.float(0,50)),r,.68,i,{s:[1,.45,1]}),k(`#5f8a3e`,N,.02,.06,.05),`matte`)}G.add(J(e,t,n,0,0,.24,O(.34,.03,.96)),`#d8c3a0`,`wood`),G.add(J(e,t,n,0,0,0,O(.08,.24,.7)),`#7a5a3e`,`wood`);for(let r of[-.27,.27])G.add(J(e,t,n,r,0,.12,O(.1,.03,.9)),`#7a5a3e`,`wood`);for(let r of[-.3,.05,.4])G.add(J(e,t,n,0,r,.5,ke(.03,.1,5),Math.PI),`#7f9a52`,`matte`);for(let r=0;r<4;r++)G.add(J(e,t,n,0,-.33+r*.22,.27,w(.05,.04,.015,10)),`#efe6d6`,`ceramic`);for(let r=0;r<6;r++){if(N.chance(.2))continue;let[i,a]=K(e,t,n,(r<3?-1:1)*.27,-.3+r%3*.3);Ct.push([i,.03,a])}}}function J(e,t,n,r,i,a,o,s=0){let[c,l]=K(e,t,n,r,i);return T(o,c,a,l,{ry:-n+s})}let Y=[],Tt=.5;for(let e=0;e<8;e++)for(let n=0;n<6;n++){let r=L+(e+(n+.5)/6)*(A/8),[i,a]=z(16.3,r),o=k(N.pick([`#d5dadc`,`#c8d0d5`,`#dfe2e0`]),N,.01,.03,.03),s=k(N.pick([`#7f96aa`,`#7389a0`,`#8ea2b4`,`#93a0ae`]),N,.01,.03,.04);G.add(J(i,a,r,.1,0,0,O(1.6,Tt,.84)),o,`plaster`),G.add(J(i,a,r,.1,0,Tt,je(1.6,.84,.34,.07)),s,`ceramic`),G.add(J(i,a,r,.1,0,.8300000000000001,O(1.76,.035,.05)),le(s,.7),`ceramic`),G.add(J(i,a,r,-.705,0,0,de(.5,.4),-Math.PI/2),`#2c2622`,`matte`),G.add(J(i,a,r,-.71,0,.4,O(.02,.05,.6)),`#6e5440`,`wood`),G.add(J(i,a,r,-.96,0,0,O(.22,.22,.8)),`#6e5440`,`wood`);for(let e of[-.22,.22])G.add(J(i,a,r,-.96,e,.22,O(.05,.12,.06)),`#3e332c`,`wood`),G.add(J(i,a,r,-1.22,e,0,w(.045,.05,.1,6)),`#5a4332`,`wood`),G.add(J(i,a,r,-.96,e,.22,O(.12,.03,.05)),`#4f8c78`,`ceramic`);for(let e=0;e<5;e++){let[e,t]=K(i,a,r,1.15+N.float(0,.45),N.float(-.42,.42));pe(G,{x:e,z:t,r:N.float(.07,.14),color:N.pick([M.carn,M.honey,`#8a8d8f`,`#c9b9a0`,`#6f8f7e`]),rng:N,flat:.8})}for(let e=0;e<3;e++){let t=w(.12,.12,.022,14);T(t,0,0,0,{rx:Math.PI/2-.22}),G.add(J(i,a,r,-.25+e*.32,.47,.11,t,Math.PI/2),N.pick([M.carn,M.chryso,M.milk,M.honey,`#2a2627`]),`polished`)}let c=[];for(let e of[-.32,.5]){for(let t of[-.09,.09])G.add(J(i,a,r,e,t,.8200000000000001,O(.03,.17,.02)),`#4a3a30`,`wood`);let[n,o]=K(i,a,r,e,0);c.push(new t(n,.9700000000000001,o))}Y.push({a:r,x:i,z:a,reels:c})}{for(let e=0;e<420;e++){let[t,n]=z(22.18,e/420*A);G.add(T(be([[.035,0],[.025,.08],[.04,.16],[.022,.24],[.03,.27]],6),t,0,n),M.milk,`stone`)}let e=U([[22.13,.27],[22.23,.27]],360);it(e),G.add(e,M.milk,`stone`);let t=U([[22.23,.27],[22.23,.22]],360);G.add(t,M.milk2,`stone`);let n=U([[22.13,.22],[22.13,.27]],360);G.add(n,M.milk2,`stone`);for(let e=0;e<8;e++){let t=L+(e+.5)*(A/8),[n,r]=z(21.93,t);G.add(T(O(.2,.12,.2),n,0,r,{ry:-t}),M.milk2,`stone`),G.add(T(ve(.12,.12,.5),n,.12,r,{ry:-t}),`#9c6b3d`,`bronze`)}let r=0;for(let e=0;e<8;e++)for(let t=0;t<7;t++){let n=L+(e+(t+1)/8)*(A/8),[i,a]=z(20.95+t%2*.55,n);Se(G,{x:i,z:a,kind:t%2?`cypress`:`palm`,h:t%2?N.float(1.3,1.8):N.float(1.4,1.9),rng:N}),r++}}P.add(rt(G,`anastasia`));{let e=[[`#f3e3c8`,`#dca85e`,`#c95a2c`,`#9c3d1f`,`#efe6d6`,`#b86a3a`],[`#f5f2ec`,`#1f1b1c`,`#f5f2ec`,`#3a3536`,`#d8d2c8`,`#1f1b1c`],[`#d6f0e2`,`#74c7a2`,`#4f9e7c`,`#a8dcc0`,`#e9f6ef`,`#3f876a`],[`#e6eef3`,`#a9c1d4`,`#7f9cb5`,`#cfdde7`,`#f2f5f7`,`#6d8aa3`]],t=N.fork(`slices`),n=Me(512,512,n=>{for(let r=0;r<4;r++){let i=r%2*256+128,a=Math.floor(r/2)*256+128,o=126,s=0,c=t.float(0,6);for(;o>3;){n.beginPath();for(let e=0;e<=72;e++){let t=e/72*A,r=o*(1+.07*Math.sin(3*t+c)+.035*Math.sin(5*t+o*.07)),s=i+Math.cos(t)*r,l=a+Math.sin(t)*r*.92;e===0?n.moveTo(s,l):n.lineTo(s,l)}n.fillStyle=e[r][s%e[r].length],n.fill(),s++,o-=t.float(2,9)}}}),r=[];for(let e of bt){let t=new ne(e.r,20),n=t.attributes.uv;for(let t=0;t<n.count;t++)n.setXY(t,n.getX(t)*.5+e.q%2*.5,n.getY(t)*.5+(1-Math.floor(e.q/2))*.5);T(t,0,0,0,{rx:-.15}),T(t,e.x-Math.cos(e.a)*.02,.2,e.z-Math.sin(e.a)*.02,{ry:-e.a-Math.PI/2}),r.push(t)}let i=V(new s({map:n,roughness:.18,side:2}),{key:`slice`}),o=new a(D(r,!0),i);o.castShadow=!0,P.add(o)}{let e=e=>{let t=new te(1,0);return t.scale(1,.72,1),_e(t.toNonIndexed(),(t,n,r,i)=>{let a=.5+.5*Math.sin(n*7+.6);i.setScalar(e?.45+.55*a:a>.5?1:.07)})},t=E(new i(1,0).toNonIndexed(),`#ffffff`),n=V(new s({vertexColors:!0,roughness:.14,metalness:0,envMapIntensity:1.6,flatShading:!0}),{key:`gem`}),r=[[`#e2873a`,`#d9a35f`,`#c4562a`],[`#f4f1ea`],[`#82d9aa`,`#6cc79a`,`#9fe3bd`],[`#a9c8e2`,`#c4d8e8`,`#93b6d3`]],a=[vt.filter(e=>e.kind===0),vt.filter(e=>e.kind===1),vt.filter(e=>e.kind>=2)],o=[e(!0),e(!1),t];a.forEach((e,t)=>{let i=C(o[t],n,e.length,(t,n,i)=>{let a=e[t];n.position.set(a.x,a.y,a.z),n.rotation.set(a.rx,a.ry,0),n.scale.setScalar(a.s),i.copy(k(N.pick(r[a.kind]),N,.01,.05,.04))},{castShadow:!1,receiveShadow:!0});P.add(i)})}let Et=e=>t=>{let n=t.getRenderTarget()?.height??t.domElement.height;e.uniforms.uScale.value=n*.9};{let e=vt.filter((e,t)=>t%3==0),t=new Float32Array(e.length*3),n=new Float32Array(e.length);e.forEach((e,r)=>{t.set([e.x,e.y+e.s*.6,e.z],r*3),n[r]=N.next()});let r=new g;r.setAttribute(`position`,new y(t,3)),r.setAttribute(`aSeed`,new y(n,1));let i=new h({uniforms:{...B,uTime:S.time,uScale:{value:600}},vertexShader:`
        ${Qe}
        attribute float aSeed;
        uniform float uTime, uScale;
        varying float vA;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          float k = max(desireAt(w.xyz), 0.06);
          float tw = pow(0.5 + 0.5 * sin(uTime * (1.8 + aSeed * 4.0) + aSeed * 40.0), 8.0);
          vA = k * tw;
          vec4 mv = viewMatrix * w;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 0.42 * uScale / max(0.001, -mv.z) * (0.3 + 0.7 * tw) * (0.5 + 0.5 * k);
        }`,fragmentShader:`
        varying float vA;
        void main() {
          vec2 q = gl_PointCoord - 0.5;
          float cr = max(exp(-abs(q.x) * 38.0) * exp(-abs(q.y) * 5.0), exp(-abs(q.y) * 38.0) * exp(-abs(q.x) * 5.0));
          float a = (cr + exp(-dot(q, q) * 90.0)) * vA;
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * a * 3.0, a);
        }`,transparent:!0,depthWrite:!1,blending:2}),a=new b(r,i);a.frustumCulled=!1,a.onBeforeRender=Et(i),P.add(a)}{let e=new Float32Array(q.length*3);q.forEach((t,n)=>e.set([t.x,.32,t.z],n*3));let t=new g;t.setAttribute(`position`,new y(e,3));let n=new h({uniforms:{...B,uTime:S.time,uScale:{value:600}},vertexShader:`
        ${Qe}
        uniform float uTime, uScale;
        varying float vA;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          float k = desireAt(w.xyz);
          vA = (0.18 + 0.82 * k) * (0.9 + 0.1 * sin(uTime * 9.0 + position.x * 3.0));
          vec4 mv = viewMatrix * w;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.9 + 1.6 * k) * uScale / max(0.001, -mv.z);
        }`,fragmentShader:`
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d); a *= a;
          gl_FragColor = vec4(vec3(1.0, 0.62, 0.28) * a * vA * 1.6, a * vA);
        }`,transparent:!0,depthWrite:!1,blending:2}),r=new b(t,n);r.frustumCulled=!1,r.onBeforeRender=Et(n),P.add(r)}let Dt=(()=>{let e=[],t=(e,t)=>_e(e,(e,n,r,i)=>{let a=Math.min(1,Math.max(0,n/t));i.set(`#ffd27a`).lerp(new ie(`#ff5a1e`),a).multiplyScalar(2.4-a)});return e.push(t(ke(.11,.34,7),.34)),e.push(t(T(ke(.07,.24,6),.06,0,.03),.24)),e.push(t(T(ke(.07,.22,6),-.05,0,-.04),.22)),D(e)})(),Ot=C(Dt,tt(`glow`),q.length,void 0,{castShadow:!1,receiveShadow:!1,colors:!1});P.add(Ot);let kt=(()=>{let e=[];e.push(E(T(x(.075,10,8),0,0,0,{s:[.78,.66,1.15]}),M.pheasant)),e.push(E(T(x(.05,8,6),0,.03,.03,{s:[1.05,.8,1]}),`#d99a3e`));for(let t of[-1,1])e.push(E(Ce([t*.04,-.02,-.04],[t*.05,-.05,-.12],.02,6),`#a8662a`)),e.push(E(T(x(.022,6,5),t*.05,-.05,-.12),`#efe1c8`));return D(e)})(),At=V(new s({vertexColors:!0,roughness:.28,metalness:.05,envMapIntensity:1.3}),{key:`lit`}),jt=C(kt,At,q.length*2,void 0,{castShadow:!0,receiveShadow:!0,colors:!1});P.add(jt);let Mt=_e(new l(.14,.14,.035,20,1).rotateX(Math.PI/2).toNonIndexed(),(e,t,n,r)=>{let i=Math.atan2(t,e),a=Math.hypot(e,t);r.set(a<.04?`#4a4038`:Math.sin(i*3)>.6?`#6f7b85`:`#9aa6ae`)}),Nt=V(new s({vertexColors:!0,roughness:.7}),{key:`lit`}),Pt=C(Mt,Nt,Y.length*2,void 0,{castShadow:!1,receiveShadow:!0,colors:!1});P.add(Pt);let Ft=xe(.25),It=C(Ft,H,Y.length*2,(e,t,n)=>{n.set(N.pick([`#6b5a4a`,`#7d6b56`,`#5c4f45`,`#8a7560`,`#4f5560`]))},{castShadow:!0,receiveShadow:!0});P.add(It);let Lt=(()=>{let e=[E(T(w(.06,.06,.14,10),0,-.07,0,{rx:0}),`#e8dcc0`),E(T(w(.075,.075,.015,12),0,-.07,0),`#5a4332`),E(T(w(.075,.075,.015,12),0,.055,0),`#5a4332`)],t=D(e);return t.rotateX(Math.PI/2),t})(),Rt=V(new s({vertexColors:!0,roughness:.7}),{key:`lit`}),zt=C(Lt,Rt,Y.length*2,void 0,{castShadow:!1,receiveShadow:!0,colors:!1});P.add(zt);let Bt=new h({uniforms:{uTime:S.time,uScale:{value:600},uSpark:{value:.4}},vertexShader:`
      attribute vec3 aDir;
      attribute float aSeed;
      uniform float uTime, uScale, uSpark;
      varying float vA;
      void main() {
        float age = fract(uTime * (1.3 + aSeed * 0.9) + aSeed * 17.0);
        vec3 p = position + aDir * age * 0.55 + vec3(0.0, -1.1 * age * age, 0.0);
        vA = (1.0 - age) * step(aSeed, uSpark);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 0.05 * uScale / max(0.001, -mv.z);
      }`,fragmentShader:`
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.7, 0.3) * 3.0 * a, a);
      }`,transparent:!0,depthWrite:!1,blending:2});{let e=Ye?9:5,t=Y.length*2*e,n=new Float32Array(t*3),r=new Float32Array(t*3),i=new Float32Array(t),a=0;for(let t of Y)for(let o of[-.24,.24]){let[s,c]=K(t.x,t.z,t.a,-1.09,o);for(let o=0;o<e;o++,a++){n.set([s,.33,c],a*3);let e=N.float(.4,1),o=N.float(-.5,.5),l=N.float(.1,.9),u=-Math.cos(t.a)*e-Math.sin(t.a)*o,d=-Math.sin(t.a)*e+Math.cos(t.a)*o;r.set([u,l,d],a*3),i[a]=N.next()}}let o=new g;o.setAttribute(`position`,new y(n,3)),o.setAttribute(`aDir`,new y(r,3)),o.setAttribute(`aSeed`,new y(i,1));let s=new b(o,Bt);s.frustumCulled=!1,s.onBeforeRender=Et(Bt),P.add(s)}P.add(C(xe(.22),H,Ct.length,(e,t,n)=>{t.position.set(Ct[e][0],Ct[e][1]-.06,Ct[e][2]),t.rotation.y=N.angle(),n.set(N.pick([`#7a3b2e`,`#2f4b6e`,`#c9a35a`,`#e8e0d0`,`#4a5d3a`,`#6d3d5e`,`#efe6d6`]))})),P.add(C(xe(.25),H,wt.length,(e,t,n)=>{t.position.set(wt[e][0],0,wt[e][2]),t.rotation.y=N.angle(),n.set(`#f1ece2`)}));let Vt=[];for(let e of[2,5.3,7.3,10.22,12.3,14.72,20.75,21.75]){let n=[];for(let r=0;r<=96;r++){let[i,a]=z(e,r/96*A);n.push(new t(i,.01,a))}Vt.push(n)}let Ht=new ye({paths:Vt,count:Ye?230:120,closed:!0,rng:N.fork(`walkers`),speed:[.14,.3],colors:[`#7a3b2e`,`#2f4b6e`,`#c9a35a`,`#efe6d6`,`#4a5d3a`,`#8e4a2c`,`#3b4a5e`,`#d8c7a5`],material:H});P.add(Ht.mesh);let Ut=(()=>{let e=[E(T(x(.06,9,6),0,0,0,{s:[1.35,.42,.8]}),`#e8b48c`),E(T(x(.04,9,7),0,.055,0),`#ecbc94`),E(T(x(.043,9,6),0,.068,-.008,{s:[1,.8,1.05]}),`#3a2a22`)];return D(e)})(),Wt=C(Ut,H,6,(e,t,n)=>{n.set([`#ffffff`,`#f3e0d2`,`#ffffff`,`#e9d3c0`,`#fff2e6`,`#f0dccb`][e])},{castShadow:!1,receiveShadow:!0});P.add(Wt);{let[e,t]=z(1.98,I+.5);P.add(C(xe(.26),H,1,(n,r,i)=>{r.position.set(e,0,t),i.set(`#4a3a5a`)}))}let Gt=new h({uniforms:{uTime:S.time,uScale:{value:600},uK:{value:0}},vertexShader:`
      attribute float aSeed;
      uniform float uTime, uScale, uK;
      varying float vA;
      void main() {
        float age = fract(uTime * (0.9 + aSeed * 0.8) + aSeed * 9.0);
        vec3 p = position;
        p.y += age * (0.9 + aSeed) * 0.6 - age * age * 0.8;
        p.xz *= 1.0 + age * 0.25;
        vA = (1.0 - age) * uK * step(0.15, p.y + 0.1);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 0.05 * uScale / max(0.001, -mv.z);
      }`,fragmentShader:`
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA;
        gl_FragColor = vec4(vec3(0.95, 1.0, 0.97) * a * 1.4, a);
      }`,transparent:!0,depthWrite:!1,blending:2});{let e=new Float32Array(420),t=new Float32Array(140);for(let n=0;n<140;n++){let[r,i]=N.inDisc(1.3);e.set([r,-.07,i],n*3),t[n]=N.next()}let n=new g;n.setAttribute(`position`,new y(e,3)),n.setAttribute(`aSeed`,new y(t,1));let r=new b(n,Gt);r.frustumCulled=!1,r.onBeforeRender=Et(Gt),P.add(r)}let Kt=[];for(let e=1;e<4;e++){let[t,n]=Ve[e],r=e===3?8:5;for(let e=0;e<r;e++)Kt.push({rho:(t+n)/2,a0:N.angle(),dir:N.sign(),sp:N.float(.18,.32),lat:N.float(-.15,.15)})}let qt=Oe(.62,`#ffffff`),Jt=C(qt,H,Kt.length,(e,t,n)=>{n.set(N.pick([`#5a3e2b`,`#6b4a32`,`#3f3a36`,`#7a5236`]))},{castShadow:!0,receiveShadow:!0});P.add(Jt);let Yt=we({sources:q.map(e=>[e.x,.5,e.z]),perSource:Ye?12:7,height:3.2,color:`#ece4da`,opacity:.16,size:[.25,1.1],life:6,wind:[R.x*.5,R.y*.5],rng:N.fork(`smoke`)});P.add(Yt);let Xt=Yt.material.uniforms,X=[],Z=N.fork(`kites`),Zt=0,Qt=0;{let e=[];Y.forEach(t=>t.reels.forEach(t=>e.push(t)));let n=[];for(let t=0;n.length<e.length&&t<6e3;t++){let[e,r]=Z.inDisc(24.5),i=e+R.x*3,a=r+R.y*3,o=t<4e3?3:2;if(n.some(e=>Math.hypot(e[0]-i,e[2]-a)<o))continue;let s=(i*R.x+a*R.y)/24;n.push([i,6.2+Z.float(0,6.5)+3.2*(s+1)*.5,a])}for(;n.length<e.length;)n.push([Z.float(-15,15),Z.float(7,14),Z.float(-15,15)]);let r=(e,t)=>e-t;n.sort((e,t)=>r(Math.atan2(e[2],e[0]),Math.atan2(t[2],t[0]))),e.map((e,t)=>({r:e,i:t,a:Math.atan2(e.z,e.x)})).sort((e,t)=>e.a-t.a).forEach((e,r)=>{let i=n[r],a=Z.chance(.38);X.push({reel:e.r,ax:i[0],ay:i[1],az:i[2],vr:Z.float(6,12.5),vy:Z.float(6,13.5),reelA:e.a,s:Z.next(),size:Z.float(1.05,1.6),hex:a,idx:a?Zt++:Qt++,p:new t})})}let $t=t=>{let n=[],r=[],i=[],a=[],o=(e,t,o,s,c=[0,0,1],l=0,u=0,d=0)=>{n.push(...e,...t,...o);for(let e=0;e<3;e++)r.push(...c),i.push(s);a.push(l,u,d)},s=(e,t,n,r,i,a,s=0,c=0)=>{o(e,t,n,i,a,s,s,c),o(t,r,n,i,a,s,c,c)},c;if(t){let e=(e,t)=>Array.from({length:6},(n,r)=>{let i=Math.PI/2+r/6*A;return[Math.cos(i)*e,Math.sin(i)*e*1.12,t]}),t=e(.3,.01),n=e(.56,-.05),r=[0,0,.02];for(let e=0;e<6;e++){let i=(e+1)%6;o(r,t[e],t[i],0),o(t[e],n[e],t[i],1),o(t[i],n[e],n[i],1)}let i=.012;for(let e=0;e<3;e++){let t=n[e],r=n[e+3],a=r[0]-t[0],o=r[1]-t[1],c=Math.hypot(a,o),l=-o/c*i,u=a/c*i;s([t[0]-l,t[1]-u,-.06],[t[0]+l,t[1]+u,-.06],[r[0]-l,r[1]-u,-.06],[r[0]+l,r[1]+u,-.06],2,[0,0,1])}c=n[3]}else{let e=[0,.72,0],t=[-.5,.2,-.08],n=[.5,.2,-.08],r=[0,-.55,0],i=[0,.2,.015];o(i,e,t,0),o(i,n,e,1),o(i,t,r,1),o(i,r,n,0);let a=.012;s([-.012,-.55,-.012],[a,-.55,-.012],[-.012,.72,-.012],[a,.72,-.012],2,[0,0,1]),s([-.5,.188,-.09],[-.5,.21200000000000002,-.09],[0,.188,-.006],[0,.21200000000000002,-.006],2,[0,0,1]),s([0,.188,-.006],[0,.21200000000000002,-.006],[.5,.188,-.09],[.5,.21200000000000002,-.09],2,[0,0,1]),c=r}let l=e=>[0,c[1]+e*3*.08-e*e*.6,-e*3];for(let e=0;e<11;e++){let t=e/11,n=(e+1)/11,r=l(t),i=l(n),a=.055*(1-t*.4),o=.055*(1-n*.4);s([-a,r[1],r[2]],[a,r[1],r[2]],[-o,i[1],i[2]],[o,i[1],i[2]],e%2,[0,1,0],t+1e-4,n)}let u=new g;return u.setAttribute(`position`,new e(n,3)),u.setAttribute(`normal`,new e(r,3)),u.setAttribute(`aPart`,new e(i,1)),u.setAttribute(`aTail`,new e(a,1)),u.computeBoundingSphere(),u},en=V(new s({vertexColors:!0,side:2,roughness:.8}),{key:`kite`,uniforms:{uTime:S.time,uSunDir:S.sunDir},vertPars:`attribute vec3 aColA; attribute vec3 aColB; attribute float aSeed; attribute float aPart; attribute float aTail; uniform float uTime;`,colorVert:`vColor = vec4(aPart < 0.5 ? aColA : (aPart < 1.5 ? aColB : vec3(0.09, 0.06, 0.05)), 1.0);`,vertMain:`
      if (aTail > 0.0) {
        float ph = uTime * 3.2 + aSeed * 6.2831 - aTail * 7.5;
        transformed.x += sin(ph) * 0.34 * aTail;
        transformed.y += sin(ph * 0.7 + 1.3) * 0.14 * aTail;
      }`,fragPars:`uniform vec3 uSunDir;`,preOut:`
      vec3 nWk = inverseTransformDirection(normal, viewMatrix);
      float back = max(0.0, dot(-nWk, normalize(uSunDir)));
      outgoingLight += diffuseColor.rgb * back * 0.55;
      outgoingLight += diffuseColor.rgb * dk * 0.28;`}),tn=[[M.kcarn,M.kmilk],[M.saffron,M.kcarn],[M.chryso,M.kmilk],[M.kmilk,M.kcarn],[M.saffron,M.chryso],[M.konyx,M.kmilk],[M.kblue,M.kmilk],[M.kcarn,M.saffron],[M.kmilk,M.chryso]],nn=(e,t)=>{let n=$t(e),r=new ae(n,en,t),i=new Float32Array(t*3),a=new Float32Array(t*3),o=new Float32Array(t),s=new ie;for(let e=0;e<t;e++){let[t,n]=Z.pick(tn);s.set(t),i.set([s.r,s.g,s.b],e*3),s.set(n),a.set([s.r,s.g,s.b],e*3),o[e]=Z.next()}return n.setAttribute(`aColA`,new c(i,3)),n.setAttribute(`aColB`,new c(a,3)),n.setAttribute(`aSeed`,new c(o,1)),r.castShadow=!0,r.receiveShadow=!1,r.frustumCulled=!1,P.add(r),r},rn=nn(!1,Qt),an=nn(!0,Zt),on=new Float32Array(X.length*14*2*3),sn=new Float32Array(X.length*14*2),cn=new Float32Array(X.length*14*2);X.forEach((e,t)=>{for(let n=0;n<14;n++){let r=(t*14+n)*2;sn[r]=n/14,sn[r+1]=(n+1)/14,cn[r]=cn[r+1]=e.s}});let ln=new g,un=new y(on,3);un.setUsage(n),ln.setAttribute(`position`,un),ln.setAttribute(`aT`,new y(sn,1)),ln.setAttribute(`aSeed`,new y(cn,1));let dn=new h({uniforms:{...B,uTime:S.time,uStr:{value:0}},vertexShader:`
      attribute float aT;
      attribute float aSeed;
      varying float vT;
      varying float vSeed;
      varying vec3 vW;
      void main() {
        vT = aT; vSeed = aSeed;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,fragmentShader:`
      ${Qe}
      uniform float uTime, uStr;
      varying float vT;
      varying float vSeed;
      varying vec3 vW;
      void main() {
        float k = max(uStr, uPoolK * (1.0 - smoothstep(uPool.w * 0.3, uPool.w, length(vW - uPool.xyz))) * 0.55 * smoothstep(0.3, 1.0, vT));
        float g = pow(max(0.0, sin((vT * 2.0 - uTime * 0.42 + vSeed * 3.0) * 6.2831)), 16.0);
        vec3 c = vec3(1.0, 0.92, 0.74) * (0.7 + g * 3.0);
        gl_FragColor = vec4(c, k * (0.38 + 0.62 * g));
      }`,transparent:!0,depthWrite:!1,blending:2}),fn=new u(ln,dn);fn.frustumCulled=!1,P.add(fn);let pn=new h({uniforms:{uTime:S.time,uScale:{value:600},uT0:{value:-100},uPos:{value:new t},uK:{value:1}},vertexShader:`
      attribute float aSeed;
      uniform float uTime, uScale, uT0, uK;
      uniform vec3 uPos;
      varying float vA;
      void main() {
        float age = (uTime - uT0 - aSeed * 0.5) / 2.6;
        vec3 p = uPos + position * (0.3 + age * 1.2) + vec3(0.0, age * 2.2, 0.0);
        vA = (age > 0.0 && age < 1.0) ? sin(age * 3.14159) * uK : 0.0;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.35 + age * 0.9) * uScale / max(0.001, -mv.z);
      }`,fragmentShader:`
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA * 0.22;
        gl_FragColor = vec4(vec3(0.86, 0.83, 0.86), a);
      }`,transparent:!0,depthWrite:!1});{let e=new Float32Array(78),t=new Float32Array(26);for(let n=0;n<26;n++){let[r,i,a]=N.onSphere();e.set([r*.5,i*.3,a*.5],n*3),t[n]=N.next()}let n=new g;n.setAttribute(`position`,new y(e,3)),n.setAttribute(`aSeed`,new y(t,1));let r=new b(n,pn);r.frustumCulled=!1,r.onBeforeRender=Et(pn),P.add(r)}P.add(Ee({y:-16,color:`#f7f1e6`,shadow:`#c3bcc4`,opacity:.85,coverage:.5,scale:.035})),P.add(Ae({count:Ye?160:80,radius:22,y0:.5,y1:12,color:`#fff3d6`,size:.05,opacity:.45,velocity:[R.x*.6,0,R.y*.6],swirl:.5,twinkle:.6,rng:N.fork(`motes`)}));let mn=new p(`#ffae55`,0,9,1.5);P.add(mn);let hn=new p(`#ffc27a`,0,30,1.1);hn.position.set(0,4,0),P.add(hn);let gn=new re(`#ffcf8f`,0);gn.position.set(-12,9,14),P.add(gn);let _n=(e,t)=>Math.abs((e-t+Math.PI*3)%A-Math.PI),vn=e=>yt.reduce((t,n)=>_n(n.a,e)<_n(t.a,e)?n:t,yt[0]),yn=e=>q.reduce((t,n)=>_n(n.a,e)<_n(t.a,e)?n:t,q[0]),bn=(e,t)=>X.reduce((n,r)=>Math.hypot(r.ax-e,r.az-t)<Math.hypot(n.ax-e,n.az-t)?r:n,X[0]),xn=e=>{let n=vn(e);return{kind:`gems`,c:new t(n.x,.4,n.z),r:3.1}},Sn=e=>{let n=yn(e);return{kind:`hearth`,c:new t(n.x,.5,n.z),r:3.5}},Cn=(e,n)=>{let r=bn(e,n);return{kind:`kites`,c:new t(r.ax,r.ay,r.az),r:5.8}},wn={kind:`pool`,c:new t(0,.3,0),r:3.8},Tn=(e,t)=>[-R.x*e+-R.y*t,-R.y*e+R.x*t],Q=[xn(I+1.6),Sn(I-.35),wn,Cn(...Tn(-8,6)),xn(I-2.3),Sn(I+2.7),Cn(...Tn(-14,-8)),xn(I+.2),wn,Sn(I+1.1)],En=6.6,Dn=3.4,On=e=>{let t=e+Dn,n=Math.floor(t/En),r=t-n*En,i=Q[(n%Q.length+Q.length)%Q.length],a=0,o=0;if(r<1.3){let e=r/1.3;a=Ie(e),o=.4+.6*Ie(e)}else if(r<5)a=1,o=1+.03*Math.sin(r*3);else if(r<6.2){let e=(r-5)/1.2;a=(1-Ne(e))*(1+.25*Math.sin(e*30)*e),o=(1-e)**.6}return{d:i,s:Math.max(0,a),r:i.r*Math.max(.04,o),n,u:r}},kn=(e,t,n)=>{let r=B.uPool.value,i=Math.hypot(e-r.x,t-r.y,n-r.z),a=B.uPoolK.value*(1-Fe(r.w*.3,r.w,i));return Math.min(1,Math.max(a,B.uWake.value))},An=new Pe(.34),jn=new m;jn.rotation.order=`YXZ`;let $=(e,t,n,r,i,a,o,s,c=1)=>{jn.position.set(n,r,i),jn.rotation.set(a,o,s),typeof c==`number`?jn.scale.setScalar(c):jn.scale.set(c[0],c[1],c[2]),jn.updateMatrix(),e.setMatrixAt(t,jn.matrix)},Mn=0,Nn=0,Pn=0,Fn=0,In=new t,Ln=new t,Rn=(e,t)=>{An.update(t);let n=An.value;B.uWake.value=n,B.uVeil.value=.42;let i=On(e);B.uPool.value.set(i.d.c.x,i.d.c.y,i.d.c.z,i.r),B.uPoolK.value=i.s,mn.position.set(i.d.c.x,i.d.kind===`kites`?i.d.c.y:1.4,i.d.c.z),mn.intensity=i.d.kind===`kites`?0:i.s*(1-n)*26,hn.intensity=n*30,gn.intensity=n*1.1;{let t=i.n*En+6.1-Dn,r=Q[((i.n-1)%Q.length+Q.length)%Q.length];e>=t?(pn.uniforms.uT0.value=t,pn.uniforms.uPos.value.copy(i.d.c)):(pn.uniforms.uT0.value=t-En,pn.uniforms.uPos.value.copy(r.c)),pn.uniforms.uK.value=1-n}Mn+=t*r.lerp(3.6,6.2,n),Nn+=t*r.lerp(5,11,n),Pn+=t*n*1.6,Bt.uniforms.uSpark.value=.35+.65*n;for(let e=0;e<Y.length;e++){let t=Y[e];for(let n=0;n<2;n++){let r=n?.24:-.24,i=e*2+n,[a,o]=K(t.x,t.z,t.a,-.96,r);$(Pt,i,a,.37,o,0,-t.a,Nn+i*.7);let[s,c]=K(t.x,t.z,t.a,-1.22,r),l=Mn+i*.37,u=.4+.14*Math.sin(l);$(It,i,s,.04,c,u,Math.PI/2-t.a,0,[1,.82,1]);let d=t.reels[n];$(zt,i,d.x,d.y-.07,d.z,0,-t.a,Pn+i)}}Pt.instanceMatrix.needsUpdate=!0,It.instanceMatrix.needsUpdate=!0,zt.instanceMatrix.needsUpdate=!0;for(let t=0;t<q.length;t++){let n=q[t],r=kn(n.x,.5,n.z),i=1+.16*Math.sin(e*13+n.seed)+.1*Math.sin(e*23.7+n.seed*2);$(Ot,t,n.x,.04,n.z,0,e*.6+n.seed,0,[.7+.4*r,(.28+1*r)*i,.7+.4*r]);for(let r=0;r<2;r++){let[i,a]=K(n.x,n.z,n.a,0,r?.13:-.13);$(jt,t*2+r,i,.43,a,0,-n.a,e*.9+n.seed+r*1.3)}}Ot.instanceMatrix.needsUpdate=!0,jt.instanceMatrix.needsUpdate=!0,Xt.uOpacity.value=.12+.12*n;let a=kn(0,.3,0);Fn+=t*(.22+.4*a);for(let t=0;t<6;t++){let n=.55+.38*Math.sin(t*2.1+.4)+.08*Math.sin(e*.7+t),r=Fn*(t%2?1:.92)+t/6*A+.25*Math.sin(e*.5+t*1.3),i=Math.cos(r)*n,o=Math.sin(r)*n;$(Wt,t,i,-.085+.012*Math.sin(e*2.2+t),o,0,-r,0),ct[t].set(i,.18+.5*a,o)}Wt.instanceMatrix.needsUpdate=!0,Gt.uniforms.uK.value=a*.9;for(let t=0;t<Kt.length;t++){let n=Kt[t],r=n.a0+n.dir*n.sp*e/n.rho,[i,a]=z(n.rho+n.lat,r),o=n.dir>0?-r:Math.PI-r;$(Jt,t,i,-.11,a,0,o,.02*Math.sin(e*1.3+t))}Jt.instanceMatrix.needsUpdate=!0;let o=Fe(0,1,n),s=1.05+.3*Math.sin(e*.13),c=0;for(let t of X){let i=t.s*A,a=t.ax+Math.sin(e*.21+i)*.7,l=t.ay+Math.sin(e*.33+i*2)*.45,u=t.az+Math.cos(e*.17+i*1.5)*.7,d=t.reelA+s+.18*Math.sin(e*.21+i),f=e*.55+i,p=Math.cos(d)*t.vr+Math.cos(f)*.6,m=Math.sin(d)*t.vr+Math.sin(f)*.6,h=t.vy+Math.sin(f*1.3)*.5;t.p.set(r.lerp(a,p,o),r.lerp(l,h,o),r.lerp(u,m,o)),In.subVectors(t.reel,t.p);let g=In.length();In.multiplyScalar(1/g);let _=Math.max(0,Math.sin(Mn+t.s*2))**6*.3*n;t.p.addScaledVector(In,_);let v=Math.atan2(In.x,In.z),y=Math.atan2(Math.sin(v-Xe),Math.cos(v-Xe)),ee=Xe+y*o+.12*Math.sin(e*.37+i)*(1-o),b=.16*Math.sin(e*.9+i*3);$(t.hex?an:rn,t.idx,t.p.x,t.p.y,t.p.z,-.62+.06*Math.sin(e*1.1+i),ee,b,t.size),Ln.copy(t.p).addScaledVector(In,.12);let te=g*.05;for(let e=0;e<14;e++)for(let n=0;n<2;n++){let r=(e+n)/14,i=(c+e*2+n)*3;on[i]=t.reel.x+(Ln.x-t.reel.x)*r,on[i+1]=t.reel.y+(Ln.y-t.reel.y)*r-te*4*r*(1-r),on[i+2]=t.reel.z+(Ln.z-t.reel.z)*r}c+=28}rn.instanceMatrix.needsUpdate=!0,an.instanceMatrix.needsUpdate=!0,un.needsUpdate=!0,dn.uniforms.uStr.value=Fe(.35,1,n),Ht.update(e)};Rn(0,0);let zn=[0,1.5,0],Bn=[zn[0]+F.x*qe,zn[1]+F.y*qe,zn[2]+F.z*qe],Vn=new t(Math.cos(Ge),0,-Math.sin(Ge)),Hn=new t().addScaledVector(Vn,-.85).addScaledVector(new t(F.x,0,F.z).normalize(),.5).normalize(),Un=[Hn.x,.7,Hn.z],Wn=new t(F.x,0,F.z).normalize(),Gn=I+.55,[Kn,qn]=z(13.700000000000001,Gn),[Jn,Yn]=z(15.700000000000001,Gn-.06);return{root:P,env:{skyTop:`#4f93cf`,skyHorizon:`#f5e6cf`,skyBottom:`#ddd5c8`,skyCurve:.55,fog:`#e8e2d6`,fogNear:95,fogFar:280,sunDir:Un,sunColor:`#fff0da`,sunIntensity:2.8,sunDisc:.6,sunGlow:.9,hemiSky:`#e3ecf3`,hemiGround:`#a88d6c`,hemiIntensity:.62,envIntensity:.7,clouds:.25,cloudColor:`#ffffff`,bloomStrength:.55,bloomThreshold:.86,bloomRadius:.5,vignette:.3,saturation:1.06,contrast:1.05,tiltShift:.3,shadowRadius:27},camera:{position:Bn,target:zn,fov:40,minDistance:12,maxDistance:120,maxPolar:1.3,autoRotate:.22,views:[{position:[F.x*18,80,F.z*18],target:[0,0,0]},{position:[Kn,1.7,qn],target:[Jn,.7,Yn]}]},interaction:{label:`Wake All Desires`,activeLabel:`One Desire at a Time`,hint:`Every desire wakes at once and closes in. Follow the strings down to the wheels.`,set:e=>An.set(e),camera:{position:[Wn.x*9.5,4.2,Wn.z*9.5],target:[-Wn.x*4,7.5,-Wn.z*4]}},update:Rn}};export{Je as default};