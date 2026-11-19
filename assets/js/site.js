/* Hen storefront. Basket stays on this device until checkout, which POSTs SKUs to the Hen checkout server. */
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

  // Product option selectors (size, pack, his-and-hers)
  function optionsRoot(from){
    var box = from && from.closest ? from.closest('.pdp') : document.querySelector('.pdp-options');
    return box ? box.querySelector('.pdp-options') : document.querySelector('.pdp-options');
  }
  function selectedOptions(root){
    if(!root) return null;
    var cfg;
    try { cfg = JSON.parse(root.getAttribute('data-options') || '{}'); } catch(e){ return null; }
    var vals = {};
    (cfg.fields || []).forEach(function(f){
      var fs = root.querySelector('[data-opt="'+f.id+'"]');
      if(!fs || fs.hidden) return;
      var inp = fs.querySelector('input:checked');
      if(inp) vals[f.id] = inp.value;
    });
    return {cfg:cfg, vals:vals};
  }
  function resolveSku(sel){
    if(!sel) return null;
    var cfg = sel.cfg, v = sel.vals;
    if(cfg.mode === 'sku_choice') return v.size || v[cfg.fields[0].id] || null;
    if(cfg.mode === 'pattern'){
      var sku = cfg.sku || '';
      Object.keys(v).forEach(function(k){ sku = sku.replace('{'+k+'}', v[k]); });
      return sku.indexOf('{') >= 0 ? null : sku;
    }
    if(cfg.mode === 'slippers'){
      if(v.kind === 'mama' && v.wsize) return 'hen-slippers-mama-'+v.wsize;
      if(v.kind === 'papa' && v.msize) return 'hen-slippers-papa-'+v.msize;
      if(v.kind === 'set' && v.wsize && v.msize) return 'hen-slippers-set-'+v.wsize+'-'+v.msize;
      return null;
    }
    return null;
  }
  function optionsComplete(root){
    var sel = selectedOptions(root);
    if(!sel) return false;
    if(sel.cfg.mode === 'slippers'){
      if(!sel.vals.kind) return false;
      if((sel.vals.kind==='mama' || sel.vals.kind==='set') && !sel.vals.wsize) return false;
      if((sel.vals.kind==='papa' || sel.vals.kind==='set') && !sel.vals.msize) return false;
      return true;
    }
    return (sel.cfg.fields || []).every(function(f){
      var fs = root.querySelector('[data-opt="'+f.id+'"]');
      if(fs && fs.hidden) return true;
      if(f.required && !sel.vals[f.id]) return false;
      return true;
    });
  }
  function updateOptionsUI(root){
    if(!root) return;
    var kindInp = root.querySelector('[data-opt="kind"] input:checked');
    var kind = kindInp ? kindInp.value : '';
    root.querySelectorAll('[data-required-when]').forEach(function(fs){
      var when = (fs.getAttribute('data-required-when') || '').split(/\s+/).filter(Boolean);
      var show = kind && when.indexOf(kind) >= 0;
      fs.hidden = !show;
      if(!show){
        fs.querySelectorAll('input').forEach(function(i){ i.checked = false; });
      }
    });
    var priceEl = document.querySelector('[data-pdp-price]');
    var sel = selectedOptions(root);
    var sku = resolveSku(sel);
    var price = null;
    if(sku && PRODUCTS[sku]) price = PRODUCTS[sku].price;
    if(price === null){
      var priced = root.querySelector('input:checked[data-price]');
      if(priced && priced.getAttribute('data-price')) price = parseFloat(priced.getAttribute('data-price'));
    }
    if(priceEl && price != null && !isNaN(price)) priceEl.textContent = money(price);
    var err = root.querySelector('[data-opt-error]');
    if(err) err.hidden = true;
  }
  document.querySelectorAll('.pdp-options').forEach(function(root){
    root.addEventListener('change', function(){ updateOptionsUI(root); });
    updateOptionsUI(root);
  });

  // Add to cart
  document.querySelectorAll('[data-add]').forEach(function(b){
    b.addEventListener('click', function(){
      var id = b.dataset.add, qInp=document.querySelector('#qty'), q= qInp ? (parseInt(qInp.value,10)||1) : 1;
      if(b.getAttribute('data-needs-options') === '1'){
        var root = optionsRoot(b);
        if(!root || !optionsComplete(root)){
          var err = root && root.querySelector('[data-opt-error]');
          if(err){ err.hidden = false; err.focus && err.focus(); }
          return;
        }
        id = resolveSku(selectedOptions(root));
      }
      if(!id || !PRODUCTS[id]){
        var root2 = optionsRoot(b);
        var err2 = root2 && root2.querySelector('[data-opt-error]');
        if(err2){ err2.hidden = false; }
        return;
      }
      var c=read(); c[id]=Math.min(9,(c[id]||0)+q); write(c);
      var p=PRODUCTS[id]; showToast('Added to your basket: <strong>'+(p?p.name:id)+'</strong> &nbsp;<a href="'+(window.HEN_ROOT||'')+'cart.html">View basket</a>');
      if (window.henTrack && p) {
        henTrack.send('cart', {id:id, name:p.name, value:p.price * q, currency:'USD', content_ids:[id], quantity:q, num_items:q});
      }
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
  function hasFamily(ids, key){
    return ids.some(function(id){
      if(id===key) return true;
      var p=PRODUCTS[id];
      if(p && p.family===key) return true;
      return false;
    });
  }
  function ineligibleCopy(ids){
    var parts=[];
    if(hasFamily(ids,'hen-family-throw')){
      parts.push("We're sorry — we can't offer express shipping on the Hen Family Throw, and we apologize for the inconvenience. It ships by the standard delivery already included in the price.");
    }
    if(hasFamily(ids,'ve-facial-care-pack')){
      parts.push("The Essential Facial Care Pack ships from the South Pacific, and we don't have an express option we can quote. Standard shipping is already included — we cover that.");
    }
    if(hasFamily(ids,'curl-scalp-set')){
      parts.push("We don't offer express shipping on the pink heatless curl set. It ships from the United Kingdom by the standard delivery already included in the price, typically about 8–14 days to the US.");
    }
    if(hasFamily(ids,'hen-family-puzzle')){
      parts.push("We don't offer express shipping on the Hen Family Puzzle. It ships by the standard delivery already included in the price.");
    }
    if(hasFamily(ids,'hen-family-socks')){
      parts.push("We don't offer express shipping on the Hen Family Socks. They ship by the standard delivery already included in the price.");
    }
    if(hasFamily(ids,'hen-family-slippers')){
      parts.push("We don't offer express shipping on the house slippers. They ship by the standard delivery already included in the price.");
    }
    if(hasFamily(ids,'hen-pet-bandana')||hasFamily(ids,'hen-pet-feeding-mat')||hasFamily(ids,'hen-pet-bowl')){
      parts.push("We don't offer express shipping on the Hen pet bandana, feeding mat, or bowl. They ship by the standard delivery already included in the price.");
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
        lines+='<div class="cart-line"><img src="'+p.img+'" alt=""><div><h3><a href="'+p.url+'">'+p.name+'</a></h3><div class="muted small">'+(p.compare?'<s class="was">'+money(p.compare)+'</s> ':'')+money(p.price)+' each</div>'+(p.compare?'<div class="saved-banner">🎉 You saved '+money((p.compare-p.price)*q)+' with our '+(p.deal_note||'deal')+' deal!</div>':'')+
        '<div class="qty" style="margin-top:8px"><button type="button" aria-label="Decrease quantity" data-dec="'+id+'">−</button><input aria-label="Quantity" value="'+q+'" readonly><button type="button" aria-label="Increase quantity" data-inc="'+id+'">+</button></div> '+
        '<button class="remove" data-rm="'+id+'">Remove</button></div><div class="price">'+(p.compare?'<s class="was">'+money(p.compare*q)+'</s><br>':'')+money(p.price*q)+'</div></div>'; });
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

  // Checkout: sends only SKUs and quantities to the Hen checkout server, which
  // creates a Stripe Checkout Session from Stripe's own prices. Off until opened.
  var CO = window.HEN_CHECKOUT || {};
  var coBtn = document.querySelector('[data-checkout]');
  if (coBtn && CO.open && CO.endpoint) {
    document.querySelectorAll('[data-checkout-closed]').forEach(function(el){ el.hidden = true; });
    document.querySelectorAll('[data-checkout-open]').forEach(function(el){ el.hidden = false; });
    var coErr = document.querySelector('[data-checkout-error]');
    var setBtn = function(){
      var c = read(), n = 0; for (var k in c) if (PRODUCTS[k] && c[k] > 0) n++;
      coBtn.disabled = n === 0; coBtn.textContent = 'Checkout securely';
    };
    setBtn();
    if (cartEl) cartEl.addEventListener('click', function(){ setTimeout(setBtn, 0); });
    coBtn.addEventListener('click', function(){
      var c = read(), items = [], value = 0, ids = [];
      for (var k in c) if (PRODUCTS[k] && c[k] > 0) { items.push({sku:k, qty:c[k]}); value += PRODUCTS[k].price * c[k]; ids.push(k); }
      if (!items.length) return;
      coBtn.disabled = true; coBtn.textContent = 'Opening secure checkout…';
      if (coErr) coErr.hidden = true;
      if (window.henTrack) henTrack.send('checkout', {value:value, currency:'USD', content_ids:ids, num_items:items.length});
      fetch(CO.endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({items:items})})
        .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, d:d}; }); })
        .then(function(x){
          if (x.ok && x.d && typeof x.d.url === 'string' && x.d.url.indexOf('https://checkout.stripe.com/') === 0) { window.location.href = x.d.url; return; }
          throw new Error((x.d && x.d.error) || 'We could not start checkout. Please try again in a moment.');
        })
        .catch(function(e){
          if (coErr) { coErr.textContent = (e && e.message) || 'We could not start checkout. Please try again in a moment.'; coErr.hidden = false; }
          setBtn();
        });
    });
  }

  // Forms that don't send yet
  document.querySelectorAll('form[data-demo]').forEach(function(f){
    f.addEventListener('submit', function(e){ e.preventDefault(); var ok=f.querySelector('.form-ok'); if(ok){ ok.classList.add('show'); ok.focus && ok.focus(); } });
  });

  // Optional mailto fallback (email sign-up before the list is connected, and product requests)
  document.querySelectorAll('form[data-mailto]').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      if (f.checkValidity && !f.checkValidity()) { f.reportValidity && f.reportValidity(); return; }
      var to = f.getAttribute('data-mailto') || 'support@kindhen.com';
      var subject = f.getAttribute('data-subject') || '';
      var parts = [];
      f.querySelectorAll('input,textarea,select').forEach(function(el){
        if (!el.name || el.disabled || el.type === 'submit') return;
        parts.push((el.name) + ': ' + (el.value || ''));
      });
      var url = 'mailto:' + encodeURIComponent(to)
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(parts.join('\n\n'));
      window.location.href = url;
      var ok = f.querySelector('.form-ok');
      if (ok) { ok.classList.add('show'); if (ok.focus) ok.focus(); }
    });
  });

  updateCount();
})();
