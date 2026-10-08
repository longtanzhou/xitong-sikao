(function(){
"use strict";
/* 深色模式切换 */
var toggle=document.getElementById('themeToggle');
if(toggle){toggle.addEventListener('click',function(){
  var el=document.documentElement;
  var dark=el.getAttribute('data-theme')==='dark';
  el.setAttribute('data-theme',dark?'light':'dark');
  try{localStorage.setItem('theme',dark?'light':'dark');}catch(e){}
});}
/* 移动端导航 */
var navToggle=document.getElementById('navToggle'),nav=document.getElementById('mainNav');
if(navToggle&&nav){navToggle.addEventListener('click',function(){nav.classList.toggle('open');});}
/* 金句轮播 */
var carousel=document.getElementById('quoteCarousel');
if(carousel){
  var slides=carousel.querySelectorAll('.quote-slide'),dotsBox=document.getElementById('quoteDots'),idx=0,timer=null;
  slides.forEach(function(_,i){var d=document.createElement('span');d.addEventListener('click',function(){go(i);reset();});dotsBox.appendChild(d);});
  var dots=dotsBox.querySelectorAll('span');
  function go(i){idx=(i+slides.length)%slides.length;
    slides.forEach(function(s,k){s.classList.toggle('active',k===idx);});
    dots.forEach(function(d,k){d.classList.toggle('on',k===idx);});}
  function reset(){if(timer)clearInterval(timer);timer=setInterval(function(){go(idx+1);},6000);}
  document.getElementById('quotePrev').addEventListener('click',function(){go(idx-1);reset();});
  document.getElementById('quoteNext').addEventListener('click',function(){go(idx+1);reset();});
  go(0);reset();
}
/* 冰山模型：点击展开 */
document.querySelectorAll('.iceberg-layer .layer-btn').forEach(function(btn){
  btn.addEventListener('click',function(){btn.closest('.iceberg-layer').classList.toggle('open');});
});
/* 系统基模筛选 */
var filterBar=document.getElementById('archetypeFilter');
if(filterBar){
  var btns=filterBar.querySelectorAll('.filter-btn');
  btns.forEach(function(b){b.addEventListener('click',function(){
    btns.forEach(function(x){x.classList.remove('active');});b.classList.add('active');
    var f=b.getAttribute('data-filter');
    document.querySelectorAll('.archetype-card').forEach(function(card){
      card.classList.toggle('hidden',f!=='all'&&card.getAttribute('data-category')!==f);
    });
  });});
}
})();
