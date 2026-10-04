/* One analytical model, two map renderers. Server credentials never enter here. */
const OpportunityMap=(()=>{
  async function loadKakao(key){
    if(!/^[a-f0-9]{32}$/i.test(key||'')) throw new Error('Map configuration unavailable');
    await new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(ok)=>{if(settled)return;settled=true;clearTimeout(timer);ok?resolve():reject(new Error('Kakao Maps unavailable'));};
      const script=document.createElement('script');
      const timer=setTimeout(()=>finish(false),8000);
      script.src='https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey='+encodeURIComponent(key);
      script.onerror=()=>finish(false);
      script.onload=()=>{if(settled)return;try{window.kakao.maps.load(()=>finish(true));}catch{finish(false);}};
      document.head.appendChild(script);
    });
  }
  class LeafletMap{
    constructor(element){
      this.provider='leaflet';this.map=L.map(element,{preferCanvas:true}).setView([37.5665,126.978],11);
      this.renderer=L.canvas();this.layers={demand:L.layerGroup().addTo(this.map),poi:L.layerGroup().addTo(this.map),sites:L.layerGroup().addTo(this.map),selection:L.layerGroup().addTo(this.map)};
      this.popup=null;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(this.map);
    }
    clear(layer){this.layers[layer].clearLayers();}
    demand(rows,onSelect){
      this.clear('demand');
      rows.forEach(r=>L.circleMarker(r.position,{radius:r.score>=95?7:5,color:r.color,fillColor:r.color,fillOpacity:.7,weight:1,renderer:this.renderer}).on('click',()=>onSelect(r.area)).addTo(this.layers.demand));
    }
    pois(rows,radius){
      this.clear('poi');
      rows.forEach(r=>L.marker(r.position,{icon:L.divIcon({className:'',html:'<div class="poi-marker"></div>',iconSize:[13,13],iconAnchor:[6,6]})}).bindPopup(r.html).addTo(this.layers.poi));
      if(radius)L.circle(radius.position,{radius:radius.meters,color:'#7c4dff',weight:1,dashArray:'5,5',fillOpacity:.025}).addTo(this.layers.poi);
    }
    sites(rows){this.clear('sites');rows.forEach(r=>L.marker(r.position,{icon:L.divIcon({className:'',html:'<div class="site-marker"></div>',iconSize:[18,18],iconAnchor:[9,9]})}).bindPopup(r.html).addTo(this.layers.sites));}
    selected(position){this.clear('selection');if(position)L.circleMarker(position,{radius:11,color:'#1a3955',fill:false,weight:3,interactive:false,renderer:this.renderer}).addTo(this.layers.selection);}
    focus(position){this.map.setView(position,15,{animate:false});}
    overview(){this.map.setView([37.5665,126.978],11,{animate:false});}
    resize(){this.map.invalidateSize({pan:false});}
    project(position){const p=this.map.latLngToContainerPoint(position);return {x:p.x,y:p.y};}
  }
  class KakaoMap{
    constructor(element){
      this.provider='kakao';const k=window.kakao.maps;
      this.map=new k.Map(element,{center:new k.LatLng(37.5665,126.978),level:8});
      this.map.addControl(new k.ZoomControl(),k.ControlPosition.LEFT);
      this.layers={demand:[],poi:[],sites:[],selection:[]};this.popup=null;
    }
    clear(layer){this.layers[layer].forEach(x=>x.setMap(null));this.layers[layer]=[];if(this.popup){this.popup.setMap(null);this.popup=null;}}
    overlay(layer,position,content,zIndex=3){
      const k=window.kakao.maps;const overlay=new k.CustomOverlay({map:this.map,position:new k.LatLng(...position),content,clickable:true,xAnchor:.5,yAnchor:.5,zIndex});
      this.layers[layer].push(overlay);return overlay;
    }
    demand(rows,onSelect){this.clear('demand');rows.forEach(r=>{
      const button=document.createElement('button');button.className='demand-marker';button.style.background=r.color;button.title=r.area.trdar_name;button.setAttribute('aria-label',r.area.trdar_name);button.onclick=()=>onSelect(r.area);
      this.overlay('demand',r.position,button,3);
    });}
    pois(rows,radius){this.clear('poi');rows.forEach(r=>{
      const button=document.createElement('button');button.className='poi-marker';button.style.padding='0';button.setAttribute('aria-label',r.name);
      button.onclick=()=>{if(this.popup)this.popup.setMap(null);this.popup=this.overlay('poi',r.position,r.html,10);};
      this.overlay('poi',r.position,button,5);
    });
      if(radius){const k=window.kakao.maps;const circle=new k.Circle({map:this.map,center:new k.LatLng(...radius.position),radius:radius.meters,strokeColor:'#7c4dff',strokeWeight:1,strokeStyle:'dash',fillColor:'#7c4dff',fillOpacity:.025});this.layers.poi.push(circle);}
    }
    sites(rows){this.clear('sites');rows.forEach(r=>{const button=document.createElement('button');button.className='site-marker';button.style.padding='0';button.setAttribute('aria-label',r.name);button.onclick=()=>{if(this.popup)this.popup.setMap(null);this.popup=this.overlay('sites',r.position,r.html,10);};this.overlay('sites',r.position,button,6);});}
    selected(position){this.clear('selection');if(position){const ring=document.createElement('span');ring.className='demand-marker selected';ring.style.display='block';ring.style.background='transparent';ring.style.pointerEvents='none';this.overlay('selection',position,ring,4);}}
    focus(position){const k=window.kakao.maps;this.map.setLevel(4);this.map.setCenter(new k.LatLng(...position));}
    overview(){const k=window.kakao.maps;this.map.setLevel(8);this.map.setCenter(new k.LatLng(37.5665,126.978));}
    resize(){this.map.relayout();}
    project(position){const p=this.map.getProjection().containerPointFromCoords(new window.kakao.maps.LatLng(...position));return {x:p.x,y:p.y};}
  }
  async function create(element,config){
    if(config?.schema_version===1&&config?.preferred_basemap==='kakao'&&config?.browser_app_key&&Array.isArray(config?.allowed_origins)&&config.allowed_origins.includes(location.origin)){
      try{await loadKakao(config.browser_app_key);return new KakaoMap(element);}catch{element.replaceChildren();}
    }
    return new LeafletMap(element);
  }
  return {create};
})();
