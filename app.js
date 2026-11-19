window.SettlX = window.SettlX || {};

(function(app) {
  app.$ = function(i) { return document.getElementById(i); };
  app.cur = '';
  app.activeTab = 'home';

  app.store = function(k, v) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) {}
  };

  app.load = function(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  };

  app.hex = function(n) {
    var s = '', c = '0123456789abcdef';
    for (var i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * 16));
    return s;
  };

  app.txh = function() {
    return '0x' + app.hex(6) + '…' + app.hex(4);
  };

  app.r2 = function(n) {
    return Math.round(n * 100) / 100;
  };

  app.fmt = function(t) {
    return new Date(t).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  };

  app.getAcct = function(u) {
    var a = null;
    try { a = JSON.parse(app.load('acct:' + u)); } catch (e) {}
    if (!a) a = { id: 'DXB' + Math.floor(10000000 + Math.random() * 89999999), since: Date.now(), payout: '' };
    if (typeof a.principal !== 'number') a.principal = 0;
    if (typeof a.earnings !== 'number') a.earnings = 0;
    if (!a.tx) a.tx = [];
    if (!a.lastAccrual) a.lastAccrual = Date.now();
    if (!a.usdt) a.usdt = { principal: 0, earnings: 0, tx: [], lastAccrual: Date.now() };
    if (typeof a.usdt.tokens !== 'number') a.usdt.tokens = 0;
    if (!a.addr) a.addr = '0x' + app.hex(40);
    if (typeof a.payout !== 'string') a.payout = '';
    return a;
  };

  app.putAcct = function(u, a) {
    app.store('acct:' + u, JSON.stringify(a));
  };

  /* PWA WEB APP INSTALL SYSTEM */
  (function setupPWA() {
    var svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#10b981"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="220" fill="#031c15">SX</text></svg>';
    var iconUrl = 'data:image/svg+xml;base64,' + btoa(svgIcon);
    var manifest = {
      name: 'SettlX Dubai — STLX Trading App',
      short_name: 'SettlX',
      start_url: '.',
      display: 'standalone',
      background_color: '#07110f',
      theme_color: '#10b981',
      icons: [{ src: iconUrl, sizes: '512x512', type: 'image/svg+xml' }]
    };
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest));
    document.head.appendChild(link);
  })();

  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  app.$('installBtn').onclick = function() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function() { deferredPrompt = null; });
    } else {
      app.$('installModal').classList.remove('hide');
    }
  };

  app.$('closeModal').onclick = function() {
    app.$('installModal').classList.add('hide');
  };

  /* BOTTOM NAVIGATION SWITCHER */
  app.switchTab = function(tabName) {
    app.activeTab = tabName;
    ['home', 'earn', 'team', 'wallet', 'me'].forEach(function(t) {
      var pane = app.$('tab-' + t);
      if (pane) pane.classList.toggle('hide', t !== tabName);
    });
    var navBtns = document.querySelectorAll('#bnav button');
    Array.prototype.forEach.call(navBtns, function(b) {
      b.setAttribute('aria-selected', b.getAttribute('data-tab') === tabName);
    });
    if (tabName === 'wallet' && app.cur) {
      app.render(app.getAcct(app.cur));
    }
  };

  Array.prototype.forEach.call(document.querySelectorAll('#bnav button'), function(b) {
    b.onclick = function() { app.switchTab(b.getAttribute('data-tab')); };
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-jump]'), function(b) {
    b.onclick = function() { app.switchTab(b.getAttribute('data-jump')); };
  });

  app.$('goWalletAll').onclick = function() { app.switchTab('wallet'); };
  app.$('openTg').onclick = function() { app.$('moreMsg').textContent = 'SettlX Dubai Community: @settlx_dubai'; };
  app.$('openHelp').onclick = function() { app.$('moreMsg').textContent = 'Support desk active for verified SettlX accounts.'; };

  /* TEAM DATA & LEVEL FILTER */
  var teamMembers = [
    { name: 'ashish_302', lvl: 'L3', date: '14 NOV', status: 'ACTIVE' },
    { name: 'bapu0122', lvl: 'L2', date: '14 NOV', status: 'ACTIVE' },
    { name: 'anil0122', lvl: 'L2', date: '14 NOV', status: 'ACTIVE' },
    { name: 'rohit_dxb', lvl: 'L1', date: '15 NOV', status: 'ACTIVE' },
    { name: 'kabir_stlx', lvl: 'L1', date: '16 NOV', status: 'ACTIVE' }
  ];

  function renderTeam(lvl) {
    var ul = app.$('teamList');
    if (!ul) return;
    ul.innerHTML = '';
    var list = teamMembers.filter(function(m) { return lvl === 'ALL' || m.lvl === lvl; });
    list.forEach(function(m) {
      var li = document.createElement('li');
      var left = document.createElement('div');
      var b = document.createElement('b'); b.textContent = m.name;
      var sm = document.createElement('small'); sm.textContent = 'LEVEL ' + m.lvl.slice(1);
      left.appendChild(b); left.appendChild(sm);

      var right = document.createElement('div');
      right.style.textAlign = 'right';
      var dt = document.createElement('b'); dt.textContent = m.date;
      var st = document.createElement('small'); st.className = 'pos'; st.textContent = m.status;
      right.appendChild(dt); right.appendChild(st);

      li.appendChild(left); li.appendChild(right); ul.appendChild(li);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('#lvlChips button'), function(b) {
    b.onclick = function() {
      var lvl = b.getAttribute('data-lvl');
      Array.prototype.forEach.call(document.querySelectorAll('#lvlChips button'), function(x) {
        x.setAttribute('aria-pressed', x === b);
      });
      renderTeam(lvl);
    };
  });

  /* REFER & EARN ACTIONS */
  app.$('copyRef').onclick = function() {
    var txt = app.$('refLink').textContent;
    try {
      navigator.clipboard.writeText(txt).then(function() {
        app.$('refMsg').textContent = 'Referral link copied.';
      });
    } catch (e) {}
  };
  app.$('shareWa').onclick = function() {
    var url = encodeURIComponent('Join SettlX Dubai: ' + app.$('refLink').textContent);
    window.open('https://wa.me/?text=' + url, '_blank');
  };
  app.$('shareTg').onclick = function() {
    var url = encodeURIComponent('Join SettlX Dubai: ' + app.$('refLink').textContent);
    window.open('https://t.me/share/url?url=' + url, '_blank');
  };

  /* ME TAB ACTIONS */
  app.$('savePayout').onclick = function() {
    if (!app.cur) return;
    var val = app.$('payoutInput').value.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(val)) {
      app.$('meMsg').textContent = 'Enter a valid BEP20 address (0x + 40 hex chars).';
      return;
    }
    var a = app.getAcct(app.cur);
    a.payout = val;
    app.$('waddr').value = val;
    app.putAcct(app.cur, a);
    app.$('meMsg').textContent = 'Payout address saved.';
  };
  app.$('meAccount').onclick = function() { app.switchTab('wallet'); };
  app.$('meRewards').onclick = function() { app.$('meMsg').textContent = 'Daily bonus & referral rewards active.'; };
  app.$('meHistory').onclick = function() { app.switchTab('wallet'); };
  app.$('meHelp').onclick = function() { app.$('meMsg').textContent = 'SettlX Help: Reach out via community channel.'; };
  app.$('langSel').onchange = function() {
    app.$('meMsg').textContent = 'Language set to ' + app.$('langSel').value + '.';
  };
  app.$('meLogout').onclick = function() {
    if (app.$('logout')) app.$('logout').click();
  };

  function renderHomeRecent(a) {
    var ul = app.$('homeRecent');
    if (!ul) return;
    ul.innerHTML = '';
    var items = a.tx.slice(0, 5);
    if (!items.length) {
      items = [
        { label: 'Daily bonus', sub: '18 NOV', amt: '+$8.00', pos: true },
        { label: 'Cash out', sub: '16 NOV', amt: '-$206.00', pos: false }
      ];
      items.forEach(function(it) {
        var li = document.createElement('li');
        var l = document.createElement('div');
        var b = document.createElement('b'); b.textContent = it.label;
        var s = document.createElement('small'); s.textContent = it.sub;
        l.appendChild(b); l.appendChild(s);
        var r = document.createElement('b');
        r.className = it.pos ? 'pos' : 'neg';
        r.textContent = it.amt;
        li.appendChild(l); li.appendChild(r); ul.appendChild(li);
      });
      return;
    }
    items.forEach(function(t) {
      var li = document.createElement('li');
      var l = document.createElement('div');
      var map = { deposit: 'Deposit', withdraw: 'Cash out', roi: 'Daily bonus', buy: 'STLX Buy', sell: 'STLX Sell', bonus: 'Daily bonus' };
      var b = document.createElement('b'); b.textContent = map[t.type] || t.type;
      var s = document.createElement('small'); s.textContent = app.fmt(t.t);
      l.appendChild(b); l.appendChild(s);
      var r = document.createElement('b');
      var out = (t.type === 'withdraw' || t.type === 'buy');
      r.className = out ? 'neg' : 'pos';
      r.textContent = (out ? '-' : '+') + app.money(t.amt);
      li.appendChild(l); li.appendChild(r); ul.appendChild(li);
    });
  }

  app.render = function(a) {
    var isMob = /^\+91/.test(app.cur);
    app.$('hi').textContent = 'Welcome to SettlX';
    app.$('dsub').textContent = app.cur;
    app.$('av').textContent = app.cur.replace(/^\+91/, '').charAt(0).toUpperCase();
    app.$('ctLabel').textContent = isMob ? 'Mobile' : 'Email';
    app.$('ctVal').textContent = app.cur;
    app.$('aid').textContent = a.id;
    app.$('since').textContent = app.fmt(a.since).split(',').slice(0, 2).join(',');
    app.$('refLink').textContent = 'https://settlx.app/register?ref=' + a.id;
    if (app.$('payoutInput') && document.activeElement !== app.$('payoutInput')) {
      app.$('payoutInput').value = a.payout || '';
    }

    renderTeam('ALL');
    renderHomeRecent(a);
    if (app.renderWallet) app.renderWallet(app.wal(a));
    if (app.renderToken) app.renderToken(a);
    if (app.syncCur) app.syncCur();
  };
})(window.SettlX);