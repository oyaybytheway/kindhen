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

  // Express preference stays on this device only, with the basket.
  var EXPRESS_KEY = 'hen-demo-express';
  function readExpress(){ try{ return JSON.parse(localStorage.getItem(EXPRESS_KEY)) || {}; }catch(e){ return {}; } }
  function writeExpress(s){ try{ localStorage.setItem(EXPRESS_KEY, JSON.stringify(s)); }catch(e){} }
  function cartSubtotal(c){
    var sub=0;
    Object.keys(c||{}).forEach(function(k){ if(PRODUCTS[k] && c[k]>0) sub+=PRODUCTS[k].price*c[k]; });
    return sub;
  }
  function ineligibleCopy(ids){
    var parts=[];
    if(ids.indexOf('hen-family-throw')>=0){
      parts.push("We're sorry — we can't offer express shipping on the Hen Family Throw, and we apologize for the inconvenience. It ships by the standard delivery already included in the price.");
    }
    if(ids.indexOf('ve-facial-care-pack')>=0){
      parts.push("The Essential Facial Care Pack ships from the South Pacific, and we don't have an express option we can quote. Standard shipping is already included — we cover that.");
    }
    return parts.join(' ');
  }
  function skippedIds(skipped){
    return (skipped||[]).map(function(s){ return s.id; });
  }
  function applyExpressTotals(sub){
    var box=document.querySelector('[data-express-box]');
    var fields=document.querySelector('[data-express-fields]');
    var row=document.querySelector('[data-express-row]');
    var costEl=document.querySelector('[data-express-cost]');
    var note=document.querySelector('[data-express-note]');
    var totEl=document.querySelector('[data-total]');
    var chk=document.querySelector('[data-express]');
    var zipInp=document.querySelector('[data-express-zip]');
    var c=read();
    var ids=Object.keys(c).filter(function(k){ return PRODUCTS[k] && c[k]>0; });
    var offer=document.querySelector('[data-express-offer]');
    var sorry=document.querySelector('[data-express-unavailable]');
    var st=readExpress();
    var eligibleIds=ids.filter(function(k){
      var ex=PRODUCTS[k]&&PRODUCTS[k].express;
      return ex && ex.eligible!==false;
    });
    var blockedIds=ids.filter(function(k){ return eligibleIds.indexOf(k)<0; });
    if(box) box.hidden=!ids.length;
    if(!ids.length){
      if(row) row.hidden=true;
      if(note) note.textContent='';
      if(sorry){ sorry.hidden=true; sorry.textContent=''; }
      if(offer) offer.hidden=true;
      if(totEl) totEl.textContent=money(sub);
      return;
    }
    if(sorry){
      var sorryText=ineligibleCopy(blockedIds);
      sorry.textContent=sorryText;
      sorry.hidden=!sorryText;
    }
    if(!eligibleIds.length){
      if(offer) offer.hidden=true;
      if(fields) fields.hidden=true;
      if(row) row.hidden=true;
      if(note) note.textContent='';
      if(totEl) totEl.textContent=money(sub);
      return;
    }
    if(offer) offer.hidden=false;
    if(chk) chk.checked=!!st.on;
    if(zipInp && document.activeElement!==zipInp) zipInp.value=st.zip||'';
    if(fields) fields.hidden=!st.on;
    if(!st.on){
      if(row) row.hidden=true;
      if(note) note.textContent='';
      if(totEl) totEl.textContent=money(sub);
      return;
    }
    var raw=zipInp?zipInp.value:(st.zip||'');
    var zip=window.HEN_EXPRESS?HEN_EXPRESS.digits(raw):String(raw||'').replace(/\D/g,'').slice(0,5);
    if(!window.HEN_EXPRESS){
      if(row) row.hidden=true;
      if(note) note.textContent='Express rates could not be loaded. Please refresh the page.';
      if(totEl) totEl.textContent=money(sub);
      return;
    }
    if(zip.length!==5){
      if(row) row.hidden=true;
      if(note) note.textContent='Enter your 5-digit delivery ZIP and we’ll add the express upcharge for that location.';
      if(totEl) totEl.textContent=money(sub);
      return;
    }
    var q=HEN_EXPRESS.quote(PRODUCTS,c,zip);
    if(!q.ok){
      if(row) row.hidden=true;
      if(note) note.textContent = q.reason==='unknown-zip'
        ? 'We couldn’t look up ZIP '+zip+'. Please check it, or write to us and we’ll quote the extra.'
        : 'We couldn’t calculate express for that ZIP just now.';
      if(totEl) totEl.textContent=money(sub);
      return;
    }
    if(!q.eligible){
      if(offer) offer.hidden=true;
      if(row) row.hidden=true;
      if(note) note.textContent='';
      if(sorry){
        var text=ineligibleCopy(skippedIds(q.skipped).concat(blockedIds));
        sorry.textContent=text;
        sorry.hidden=!text;
      }
      if(totEl) totEl.textContent=money(sub);
      return;
    }
    if(row) row.hidden=false;
    if(costEl) costEl.textContent=money(q.total);
    var parts=[];
    if(q.total===0){
      parts.push('For ZIP '+zip+', USPS Priority Mail is at or below the standard shipping already included, so there’s no extra to pay. We’ll still request Priority if our fulfiller can send it that way.');
    } else {
      parts.push('This is the extra you pay for ZIP '+zip+'. We only cover standard delivery.');
      var hasTbd=q.lines.some(function(l){ return l.origin==='us-tbd'; });
      if(hasTbd){
        parts.push('For items whose warehouse city isn’t confirmed yet, we quote the farthest lower-48 zone so the upcharge isn’t short. If the real extra is less at checkout, you’ll pay the lower amount.');
      } else {
        parts.push('Quoted from official USPS Priority Mail rates for your location.');
      }
      parts.push('Confirmed at payment, and only charged if we can actually send it Priority.');
    }
    if(q.skipped && q.skipped.length){
      // The apology for items we can't send express is already in the notice above.
    }
    parts.push('Even with express, we can’t promise arrival by a holiday.');
    if(note) note.textContent=parts.join(' ');
    if(totEl) totEl.textContent=money(sub+q.total);
  }

  // Cart page
  var cartEl=document.querySelector('[data-cart]');
  function renderCart(){
    if(!cartEl) return;
    var c=read(), lines='', sub=cartSubtotal(c), ids=Object.keys(c).filter(function(k){return PRODUCTS[k] && c[k]>0;});
    if(!ids.length){
      cartEl.innerHTML='<div class="empty"><h2>Your basket is empty</h2><p class="muted">Have a look around the nest — everything is priced fairly, every day.</p><a class="btn btn--primary" href="index.html#favorites">See holiday favorites</a></div>';
    } else {
      ids.forEach(function(id){ var p=PRODUCTS[id], q=c[id];
        lines+='<div class="cart-line"><img src="'+p.img+'" alt=""><div><h3><a href="'+p.url+'">'+p.name+'</a></h3><div class="muted small">'+money(p.price)+' each</div>'+
        '<div class="qty" style="margin-top:8px"><button type="button" aria-label="Decrease quantity" data-dec="'+id+'">−</button><input aria-label="Quantity" value="'+q+'" readonly><button type="button" aria-label="Increase quantity" data-inc="'+id+'">+</button></div> '+
        '<button class="remove" data-rm="'+id+'">Remove</button></div><div class="price">'+money(p.price*q)+'</div></div>'; });
      cartEl.innerHTML=lines;
    }
    var subEl=document.querySelector('[data-subtotal]');
    if(subEl) subEl.textContent=money(sub);
    applyExpressTotals(sub);
    cartEl.querySelectorAll('[data-inc]').forEach(function(b){ b.onclick=function(){ var c=read(); c[b.dataset.inc]=Math.min(9,c[b.dataset.inc]+1); write(c); renderCart(); }; });
    cartEl.querySelectorAll('[data-dec]').forEach(function(b){ b.onclick=function(){ var c=read(); c[b.dataset.dec]=Math.max(1,c[b.dataset.dec]-1); write(c); renderCart(); }; });
    cartEl.querySelectorAll('[data-rm]').forEach(function(b){ b.onclick=function(){ var c=read(); delete c[b.dataset.rm]; write(c); renderCart(); }; });
  }
  var expressChk=document.querySelector('[data-express]');
  var expressZip=document.querySelector('[data-express-zip]');
  if(expressChk){
    expressChk.addEventListener('change', function(){
      var s=readExpress(); s.on=expressChk.checked; writeExpress(s);
      applyExpressTotals(cartSubtotal(read()));
    });
  }
  if(expressZip){
    var saved=readExpress();
    if(saved.zip) expressZip.value=saved.zip;
    expressZip.addEventListener('input', function(){
      var s=readExpress();
      s.zip=window.HEN_EXPRESS?HEN_EXPRESS.digits(expressZip.value):expressZip.value;
      writeExpress(s);
      applyExpressTotals(cartSubtotal(read()));
    });
  }
  renderCart();

  // Forms that don't send yet
  document.querySelectorAll('form[data-demo]').forEach(function(f){
    f.addEventListener('submit', function(e){ e.preventDefault(); var ok=f.querySelector('.form-ok'); if(ok){ ok.classList.add('show'); ok.focus && ok.focus(); } });
  });

  updateCount();
})();
