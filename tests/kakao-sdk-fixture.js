/* SYNTHETIC SDK contract fixture — never evidence of real Kakao acceptance. */
(()=>{
  class LatLng{constructor(lat,lng){this.lat=lat;this.lng=lng;}getLat(){return this.lat;}getLng(){return this.lng;}}
  class Map{constructor(element,options){this.element=element;this.center=options.center;this.level=options.level;this.overlays=new Set();element.dataset.syntheticKakao='true';}addControl(){}setLevel(level){this.level=level;this.redraw();}setCenter(center){this.center=center;this.redraw();}getProjection(){return {containerPointFromCoords:p=>({x:this.element.clientWidth/2+(p.lng-this.center.lng)*5000,y:this.element.clientHeight/2-(p.lat-this.center.lat)*5000})};}relayout(){this.redraw();}redraw(){this.overlays.forEach(o=>o.draw());}}
  class CustomOverlay{constructor(o){this.position=o.position;this.node=document.createElement('div');this.node.style.position='absolute';this.node.style.zIndex=o.zIndex;if(typeof o.content==='string')this.node.innerHTML=o.content;else this.node.append(o.content);this.setMap(o.map);}setMap(map){if(this.map)this.map.overlays.delete(this);this.node.remove();this.map=map;if(map){map.overlays.add(this);map.element.append(this.node);this.draw();}}draw(){if(!this.map)return;const p=this.map.getProjection().containerPointFromCoords(this.position);this.node.style.left=p.x+'px';this.node.style.top=p.y+'px';}}
  class Circle{constructor(o){this.options=o;this.setMap(o.map);}setMap(map){this.map=map;}}
  window.kakao={maps:{Map,LatLng,CustomOverlay,Circle,ZoomControl:class{},ControlPosition:{LEFT:1},load:callback=>callback()}};
})();
