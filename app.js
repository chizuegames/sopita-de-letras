'use strict';
const names=['Champiñón','Pescado','Brócoli','Cilantro','Cebolla','Camarón','Ají','Papa','Mazorca','Zanahoria','Carne','Pollo'];
// Clockwise from the upper-left plate, matching the supplied layout.
const positions=[[35.6,14.2],[64.3,14.2],[83.2,25.8],[83.2,41.9],[83.2,58.1],[83.2,74.2],[64.3,85.8],[35.6,85.8],[16.7,74.2],[16.7,58.1],[16.7,41.9],[16.7,25.8]];
const table=document.querySelector('#table');
const center=document.querySelector('#center');
const category=document.querySelector('#category');
const seconds=document.querySelector('#seconds');
const clock=document.querySelector('#clock');
let state='welcome',deadline=0,ticker=null,transition=null,lastCategory='';
let activeKey='random',hiddenIngredient=null,pausedRemaining=30000;
let tapTimer=null,holdTimer=null,press=null;
const music=new Audio('A%20New%20Home%20Found.mp3');
music.loop=true;music.preload='auto';
function playMusic(){music.play().catch(()=>{});}
function clearTap(){clearTimeout(tapTimer);tapTimer=null;}
function syncIngredients(){table.querySelectorAll('button').forEach(b=>b.disabled=state!=='playing'||b.hidden);}

const bags=new Map();
function draw(key){
  let bag=bags.get(key);
  if(!bag?.length){
    bag=[...CATEGORIES[key]];
    for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
    if(bag.length>1&&bag[bag.length-1]===lastCategory)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
    bags.set(key,bag);
  }
  lastCategory=bag.pop();return lastCategory;
}
function showRound(key){
  clearInterval(ticker);
  const stayPaused=state==='paused';
  state=stayPaused?'paused':'playing';activeKey=key;pausedRemaining=30000;
  document.querySelector('#hint').hidden=true;
  document.querySelector('#round').hidden=false;
  category.textContent=draw(key);
  center.setAttribute('aria-label',category.textContent);
  deadline=Date.now()+30000;
  seconds.textContent='30';clock.setAttribute('aria-label','30 segundos');clock.classList.remove('urgent');
  if(!stayPaused){updateClock();ticker=setInterval(updateClock,100);}
  syncIngredients();
}
function updateClock(){
  if(state!=='playing')return;
  const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));
  if(remaining===0){showRound('random');return;}
  seconds.textContent=remaining;
  clock.setAttribute('aria-label',`${remaining} segundos`);
  clock.classList.toggle('urgent',remaining<=5);
}
names.forEach((name,index)=>{
  const button=document.createElement('button');
  button.className='ingredient';
  button.setAttribute('aria-label',`Añadir ${name.toLowerCase()}`);
  button.style.setProperty('--x',`${positions[index][0]}%`);
  button.style.setProperty('--y',`${positions[index][1]}%`);
  const plate=document.createElement('span');plate.className='plate';
  const img=document.createElement('img');img.src=`ING${index+1}.png`;img.alt='';img.draggable=false;
  plate.append(img);button.append(plate);table.append(button);
  button.disabled=true;
  button.addEventListener('click',()=>{
    if(state!=='playing'||button.disabled)return;
    clearTap();
    if(hiddenIngredient){hiddenIngredient.classList.remove('cooking');hiddenIngredient.hidden=false;hiddenIngredient.disabled=false;}
    hiddenIngredient=button;
    state='transition';clearInterval(ticker);syncIngredients();
    button.disabled=true;button.classList.add('cooking');
    const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?90:710;
    transition=setTimeout(()=>{
      button.hidden=true;
      showRound(index===2?'random':String(index+1));
    },duration);
  });
});

function togglePause(){
  if(state==='playing'){
    pausedRemaining=Math.max(1,deadline-Date.now());state='paused';clearInterval(ticker);music.pause();
    document.querySelector('#pause-label').hidden=false;
  }else if(state==='paused'){
    state='playing';deadline=Date.now()+pausedRemaining;
    document.querySelector('#pause-label').hidden=true;updateClock();ticker=setInterval(updateClock,100);playMusic();
  }
  syncIngredients();
}
function returnToTitle(){
  clearTap();clearTimeout(holdTimer);clearTimeout(transition);clearInterval(ticker);
  state='welcome';hiddenIngredient=null;activeKey='random';bags.clear();lastCategory='';
  music.pause();music.currentTime=0;
  table.querySelectorAll('button').forEach(b=>{b.hidden=false;b.disabled=true;b.classList.remove('cooking');});
  table.hidden=true;center.hidden=true;
  document.querySelector('#welcome').hidden=false;
  document.querySelector('#hint').hidden=false;
  document.querySelector('#round').hidden=true;
  document.querySelector('#pause-label').hidden=true;
}
function singleTap(){
  if(state==='ready')showRound('random');
  else if(state==='playing'||state==='paused')showRound(activeKey);
}
document.querySelector('#welcome').addEventListener('click',()=>{
  if(state!=='welcome')return;
  playMusic();
  state='ready';document.querySelector('#welcome').hidden=true;table.hidden=false;center.hidden=false;
});
center.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||press)return;
  event.preventDefault();center.setPointerCapture(event.pointerId);
  const isSecond=tapTimer!==null;clearTap();
  press={id:event.pointerId,x:event.clientX,y:event.clientY,second:isSecond,cancelled:false,held:false};
  holdTimer=setTimeout(()=>{
    if(!press||press.cancelled)return;
    press.held=true;returnToTitle();
  },650);
});
center.addEventListener('pointermove',event=>{
  if(!press||event.pointerId!==press.id)return;
  if(Math.hypot(event.clientX-press.x,event.clientY-press.y)>18){press.cancelled=true;clearTimeout(holdTimer);}
});
center.addEventListener('pointerup',event=>{
  if(!press||event.pointerId!==press.id)return;
  event.preventDefault();clearTimeout(holdTimer);
  const previous=press;press=null;
  if(previous.held||previous.cancelled)return;
  if(previous.second){togglePause();return;}
  tapTimer=setTimeout(()=>{tapTimer=null;singleTap();},320);
});
center.addEventListener('pointercancel',()=>{clearTimeout(holdTimer);clearTap();press=null;});
center.addEventListener('lostpointercapture',()=>{if(press){clearTimeout(holdTimer);press=null;}});
center.addEventListener('contextmenu',event=>event.preventDefault());
center.addEventListener('dblclick',event=>event.preventDefault());
center.addEventListener('click',event=>{if(event.detail===0)singleTap();});
center.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();returnToTitle();}
  if(event.key.toLowerCase()==='p'){event.preventDefault();togglePause();}
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateClock();});
