function el(id){return document.getElementById(id);}
function renderAll(){
  const d={savesTotal:{str:2,dex:3,con:4,int_:0,wis:1,cha:-1}};
  el("saveStrTotalSpan").textContent = "+2";
}