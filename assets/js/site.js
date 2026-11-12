/* Hen storefront preview — front-end only. No real checkout, no data leaves the browser. */
(function(){
  var PRODUCTS = window.HEN_PRODUCTS || {};
  var KEY = 'hen-demo-cart';
  function read(){ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } }
  function write(c){ try{ localStorage.setItem(KEY, JSON.stringify(c)); }catch(e){} updateCount(); }
  function count(c){ var n=0; for(var k in c) n+=c[k]; return n; }
  function money(n){ return '$' + n.toFixed(2); }
  function updateCount(){
    var n = count(read());
    document.querySelectorAll('.cart-count').forEach(function(el){ el.textContent=n; el.setAttribute('data-n', n); });
  }

  // Mobile drawer
  var drawer = document.querySelector('.drawer');
  function setDrawer(open){
    if(!drawer) return;
    drawer.classList.toggle('is-open', open);
    document.querySelectorAll('[data-menu-open]').forEach(function(b){ b.setAttribute('aria-expanded', open); });
    document.body.style.overflow = open ? 'hidden' : '';
    if(open){ var f = drawer.querySelector('a,button'); f && f.focus(); }
  }
  document.querySelectorAll('[data-menu-open]').forEach(function(b){ b.addEventListener('click', function(){ setDrawer(true); }); });
  document.querySelectorAll('[data-menu-close]').forEach(function(b){ b.addEventListener('click', function(){ setDrawer(false); }); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') setDrawer(false); });

  // Holiday announcement rotator
  var msgs = document.querySelectorAll('.announce__msg');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(msgs.length){
    var i = 0; msgs[0].classList.add('is-on');
    if(!reduce && msgs.length>1){
      setInterval(function(){
        var cur = msgs[i]; cur.classList.remove('is-on'); cur.classList.add('is-off');
        setTimeout(function(){ cur.classList.remove('is-off'); }, 650);
        i = (i+1) % msgs.length; msgs[i].classList.add('is-on');
      }, 4800);
    }
  }

  // Gentle snow in hero
  var snow = document.querySelector('.snow');
  if(snow && !reduce){
    for(var s=0;s<26;s++){
      var d=document.createElement('i'); var size=(3+Math.random()*5).toFixed(1);
      d.style.left=(Math.random()*100)+'%'; d.style.width=d.style.height=size+'px';
      d.style.opacity=(0.35+Math.random()*0.5).toFixed(2);
      d.style.animationDuration=(9+Math.random()*10).toFixed(1)+'s';
      d.style.animationDelay=(-Math.random()*18).toFixed(1)+'s';
      snow.appendChild(d);
    }
  }

  // Reveal on scroll
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target);} }); }, {threshold:.12});
    document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  } else { document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('is-in'); }); }

  // Toast
  var toast = document.querySelector('.toast'); var tt;
  function showToast(html){ if(!toast) return; toast.querySelector('.toast__msg').innerHTML=html; toast.classList.add('show'); clearTimeout(tt); tt=setTimeout(function(){ toast.classList.remove('show'); }, 3800); }

  // Qty steppers
  document.querySelectorAll('.qty').forEach(function(q){
    var inp=q.querySelector('input');
    q.querySelectorAll('button').forEach(function(b){ b.addEventListener('click', function(){
      var v=parseInt(inp.value,10)||1; v+= (b.dataset.step==='+'?1:-1); inp.value=Math.max(1,Math.min(9,v));
    }); });
  });

  // Add to cart
  document.querySelectorAll('[data-add]').forEach(function(b){
    b.addEventListener('click', function(){
      var id=b.dataset.add, qInp=document.querySelector('#qty'), q= qInp ? (parseInt(qInp.value,10)||1) : 1;
      var c=read(); c[id]=Math.min(9,(c[id]||0)+q); write(c);
      var p=PRODUCTS[id]; showToast('Added to your basket: <strong>'+(p?p.name:id)+'</strong> &nbsp;<a href="'+(window.HEN_ROOT||'')+'cart.html">View basket</a>');
    });
  });

  // Cart page
  var cartEl=document.querySelector('[data-cart]');
  function renderCart(){
    if(!cartEl) return;
    var c=read(), lines='', sub=0, ids=Object.keys(c).filter(function(k){return PRODUCTS[k] && c[k]>0;});
    if(!ids.length){
      cartEl.innerHTML='<div class="empty"><h2>Your basket is empty</h2><p class="muted">Have a look around the nest — everything is priced fairly, every day.</p><a class="btn btn--primary" href="index.html#favorites">See holiday favorites</a></div>';
    } else {
      ids.forEach(function(id){ var p=PRODUCTS[id], q=c[id]; sub+=p.price*q;
        lines+='<div class="cart-line"><img src="'+p.img+'" alt=""><div><h3><a href="'+p.url+'">'+p.name+'</a></h3><div class="muted small">'+money(p.price)+' each</div>'+
        '<div class="qty" style="margin-top:8px"><button type="button" aria-label="Decrease quantity" data-dec="'+id+'">−</button><input aria-label="Quantity" value="'+q+'" readonly><button type="button" aria-label="Increase quantity" data-inc="'+id+'">+</button></div> '+
        '<button class="remove" data-rm="'+id+'">Remove</button></div><div class="price">'+money(p.price*q)+'</div></div>'; });
      cartEl.innerHTML=lines;
    }
    var subEl=document.querySelector('[data-subtotal]'), totEl=document.querySelector('[data-total]');
    if(subEl) subEl.textContent=money(sub); if(totEl) totEl.textContent=money(sub);
    cartEl.querySelectorAll('[data-inc]').forEach(function(b){ b.onclick=function(){ var c=read(); c[b.dataset.inc]=Math.min(9,c[b.dataset.inc]+1); write(c); renderCart(); }; });
    cartEl.querySelectorAll('[data-dec]').forEach(function(b){ b.onclick=function(){ var c=read(); c[b.dataset.dec]=Math.max(1,c[b.dataset.dec]-1); write(c); renderCart(); }; });
    cartEl.querySelectorAll('[data-rm]').forEach(function(b){ b.onclick=function(){ var c=read(); delete c[b.dataset.rm]; write(c); renderCart(); }; });
  }
  renderCart();

  // Forms that don't send yet
  document.querySelectorAll('form[data-demo]').forEach(function(f){
    f.addEventListener('submit', function(e){ e.preventDefault(); var ok=f.querySelector('.form-ok'); if(ok){ ok.classList.add('show'); ok.focus && ok.focus(); } });
  });

  updateCount();
})();
