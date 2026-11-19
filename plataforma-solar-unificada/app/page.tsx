"use client";

import { useEffect, useRef, useState } from "react";
import SunrunCalculator from "./components/SunrunCalculator";
import CashCalculator from "./components/MacCalculator";

type Platform = "sunrun" | "lightreach" | "cash";
const platforms: Array<{id:Platform;label:string;description:string}> = [
  {id:"sunrun",label:"Sunrun",description:"EPC · pagos · comisiones"},
  {id:"lightreach",label:"Lightreach",description:"Tesla · Enphase IQ 5P"},
  {id:"cash",label:"Cash",description:"Contado · préstamos"}
];

export default function HomePage(){
  const [platform,setPlatform]=useState<Platform>("sunrun");
  const [frameHeight,setFrameHeight]=useState(1400);
  const frame=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{
    const onMessage=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin||event.source!==frame.current?.contentWindow)return;
      if(event.data?.type==="lightreach:height"&&Number.isFinite(event.data.height)){
        const h=Math.max(400,Math.min(8000,Math.ceil(event.data.height)));
        setFrameHeight(h);
      }
    };
    window.addEventListener("message",onMessage);
    return ()=>window.removeEventListener("message",onMessage);
  },[]);
  const selectPlatform=(next:Platform)=>{
    setPlatform(next);
    if(next==="lightreach"){
      window.requestAnimationFrame(()=>frame.current?.contentWindow?.postMessage({type:"lightreach:requestHeight"},window.location.origin));
    }
  };
  return (
    <main className="app-shell">
      <header className="brand-header">
        <div className="header-copy">
          <p className="eyebrow">PLATAFORMA SOLAR</p>
          <h1>Calculadora <em>Multiplataforma</em></h1>
          <p>Sunrun · Lightreach Palmetto · Cash</p>
        </div>
        <div className="header-aside">Tres plataformas.<br/>Una sola herramienta.</div>
      </header>
      <nav className="platform-nav" aria-label="Seleccionar plataforma">
        {platforms.map(item=>(
          <button key={item.id} type="button" className={`platform-tab ${platform===item.id?"active":""}`} aria-pressed={platform===item.id} onClick={()=>selectPlatform(item.id)}>
            <strong>{item.label}</strong><span>{item.description}</span>
          </button>
        ))}
      </nav>
      <section className="module-stage" hidden={platform!=="sunrun"} aria-label="Calculadora Sunrun"><SunrunCalculator/></section>
      <section className="module-stage" hidden={platform!=="lightreach"} aria-label="Calculadora Lightreach">
        <iframe ref={frame} title="Calculadora Lightreach Palmetto" src="/lightreach/index.html" className="lightreach-frame" style={{height:frameHeight}} onLoad={()=>frame.current?.contentWindow?.postMessage({type:"lightreach:requestHeight"},window.location.origin)}/>
      </section>
      <section className="module-stage" hidden={platform!=="cash"} aria-label="Calculadora Cash"><CashCalculator/></section>
    </main>
  );
}
