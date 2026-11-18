/* =========================================================
   香香的心愿本 · 写给臭臭
   数据只存在本机 localStorage
   ========================================================= */
(() => {
  "use strict";

  const KEY = "xiangwish.v1";
  const UI_KEY = "xiangwish.ui";
  const MAX = 120;

  const CATS = [
    {
      id: "todo",
      name: "想让你做",
      icon: "✿",
      tagline: "别客气，尽管说",
      placeholder: "比如：周末陪我去江边走走，把手机放口袋里。",
    },
    {
      id: "change",
      name: "想让你改",
      icon: "✦",
      tagline: "一点点就好",
      placeholder: "比如：生气的时候先说一句「我需要缓一下」，别直接沉默。",
    },
    {
      id: "food",
      name: "想吃",
      icon: "❀",
      tagline: "投喂清单",
      placeholder: "比如：城南那家草莓蛋糕，想吃一整个，不切块。",
    },
    {
      id: "want",
      name: "想要",
      icon: "♡",
      tagline: "小心愿",
      placeholder: "比如：一个不用设闹钟的周六早晨。",
    },
    {
      id: "words",
      name: "想说的话",
      icon: "✉",
      tagline: "悄悄话",
      placeholder: "比如：今天也很喜欢你，比昨天多一点点。",
    },
  ];

  const CAT_MAP = new Map(CATS.map((c) => [c.id, c]));
  const IMG = {
    duo: "assets/img/duo.png",
    snack: "assets/img/snack.png",
    berry: "assets/img/bubu-berry.png",
  };

  const $ = (sel, root = document) => root.querySelector(sel);

  /* ---------------- data ---------------- */

  let items = [];
  let filter = "all";
  let hideDone = false;
  let editingId = null;
  let lastDeleted = null;

  const day = 864e5;
  const startOfDay = (t) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function seed() {
    const now = Date.now();
    const raw = [
      ["todo", "周末陪我去江边走走，不带耳机，就聊天。", 0, false, true],
      ["words", "今天也很喜欢你，比昨天多一点点。", 0, false, false],
      ["food", "城南那家草莓蛋糕，想吃一整个，不切块。", 1, false, false],
      ["change", "生气时不要冷处理，告诉我「我需要缓一下」就好，我会等。", 3, false, true],
      ["want", "一起拍一组大头贴，贴在你的钱包里。", 4, false, false],
      ["todo", "我难过的时候，先抱一下，别急着讲道理。", 6, true, false],
      ["food", "你做的番茄牛腩，汤多放一点，能拌两碗饭。", 8, false, false],
      ["words", "谢谢你把我那些奇奇怪怪的念头，都当成正经事。", 10, true, false],
      ["want", "一个不用设闹钟的周六早晨。", 13, false, false],
      ["change", "答应的事放进备忘录，别只放在心里呀。", 17, false, false],
    ];
    return raw.map(([cat, text, daysAgo, done, pinned], i) => ({
      id: uid(),
      cat,
      text,
      done,
      pinned,
      createdAt: startOfDay(now - daysAgo * day) + 10 * 3600e3 + i * 137e3,
      doneAt: done ? startOfDay(now - Math.max(0, daysAgo - 2) * day) + 20 * 3600e3 : null,
    }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        items = seed();
        save();
        return;
      }
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed.items;
      items = Array.isArray(list)
        ? list.filter((x) => x && x.id && x.text && CAT_MAP.has(x.cat))
        : [];
    } catch (e) {
      items = seed();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, items }));
    } catch (e) {
      toast("保存失败，可能是浏览器空间满了");
    }
  }

  function saveUI() {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ filter, hideDone }));
    } catch (e) {
      /* 忽略 */
    }
  }

  function loadUI() {
    try {
      const ui = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
      if (ui.filter === "all" || CAT_MAP.has(ui.filter)) filter = ui.filter;
      hideDone = !!ui.hideDone;
    } catch (e) {
      /* 忽略 */
    }
  }

  /* ---------------- helpers ---------------- */

  const ICON = {
    star: '<svg viewBox="0 0 24 24"><path d="M12 3.6l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2 6.9 19l1.1-5.6L3.8 9.5l5.7-.7z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4"/><path d="M8.2 12.2l2.6 2.6 5-5.2"/></svg>',
    undo: '<svg viewBox="0 0 24 24"><path d="M5 9.5h5.5M5 9.5V4"/><path d="M5.4 9.4a7.4 7.4 0 1 1-1.1 6.1"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M14.2 5.6l4.2 4.2M4.8 19.2l.9-4.6L15.5 4.8a1.8 1.8 0 0 1 2.5 0l1.2 1.2a1.8 1.8 0 0 1 0 2.5l-9.8 9.8-4.6.9z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V5.4c0-.7.6-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7M6.6 7l.8 11.2c0 .8.7 1.4 1.5 1.4h6.2c.8 0 1.5-.6 1.5-1.4L17.4 7"/></svg>',
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function iconBtn(cls, icon, label) {
    const b = el("button", "icon-btn " + cls);
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.title = label;
    b.innerHTML = ICON[icon];
    return b;
  }

  function relTime(ts) {
    const d = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / day);
    if (d <= 0) return "今天";
    if (d === 1) return "昨天";
    if (d < 7) return d + " 天前";
    const t = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    const ymd = t.getFullYear() + "." + pad(t.getMonth() + 1) + "." + pad(t.getDate());
    return t.getFullYear() === new Date().getFullYear() ? ymd.slice(5) : ymd;
  }

  /* ---------------- toast ---------------- */

  function toast(message, actionLabel, onAction) {
    const wrap = $("#toasts");
    const t = el("div", "toast");
    t.append(el("span", "", message));
    if (actionLabel) {
      const b = el("button", "", actionLabel);
      b.type = "button";
      b.addEventListener("click", () => {
        onAction && onAction();
        dismiss();
      });
      t.append(b);
    }
    wrap.append(t);
    let done = false;
    function dismiss() {
      if (done) return;
      done = true;
      t.classList.add("is-out");
      setTimeout(() => t.remove(), 320);
    }
    setTimeout(dismiss, actionLabel ? 6000 : 2600);
    return dismiss;
  }

  /* ---------------- stats / tabs ---------------- */

  function visibleItems() {
    return items
      .filter((x) => (filter === "all" ? true : x.cat === filter))
      .filter((x) => (hideDone ? !x.done : true))
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.createdAt - a.createdAt;
      });
  }

  function renderStats() {
    const total = items.length;
    const done = items.filter((x) => x.done).length;
    $("#statTotal").textContent = total;
    $("#statDone").textContent = done;
    $("#statLeft").textContent = total - done;
    const pct = total ? Math.round((done / total) * 100) : 0;
    $("#progressBar").style.width = pct + "%";
    $(".progress").setAttribute("aria-label", "已实现 " + pct + "%");
  }

  function renderTabs() {
    const tabs = $("#tabs");
    tabs.textContent = "";
    const counts = new Map(CATS.map((c) => [c.id, 0]));
    items.forEach((x) => counts.set(x.cat, (counts.get(x.cat) || 0) + 1));

    const make = (id, name, icon, n) => {
      const b = el("button", "tab");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(filter === id));
      b.dataset.filter = id;
      if (id !== "all") b.dataset.cat = id;
      b.append(el("span", "dot-c"));
      b.append(el("span", "", name));
      b.append(el("span", "n", String(n)));
      return b;
    };

    tabs.append(make("all", "全部", null, items.length));
    CATS.forEach((c) => tabs.append(make(c.id, c.name, c.icon, counts.get(c.id) || 0)));
  }

  /* ---------------- cards ---------------- */

  function cardNode(item) {
    const cat = CAT_MAP.get(item.cat);
    const card = el("article", "card");
    card.dataset.id = item.id;
    card.dataset.cat = item.cat;
    card.classList.toggle("is-done", !!item.done);
    card.classList.toggle("is-pinned", !!item.pinned);

    const top = el("div", "card-top");
    const chip = el("span", "chip");
    chip.append(el("i", "", cat.icon), el("span", "", cat.name));
    top.append(chip);

    const pin = iconBtn("act-pin" + (item.pinned ? " is-on" : ""), "star", item.pinned ? "取消置顶" : "置顶");
    top.append(pin);
    card.append(top);

    const text = el("p", "card-text", item.text);
    card.append(text);

    const foot = el("div", "card-foot");
    foot.append(el("time", "card-time", relTime(item.createdAt)));

    const actions = el("div", "card-actions");
    const doneBtn = iconBtn("act-done", item.done ? "undo" : "check", item.done ? "取消实现" : "实现啦");
    const editBtn = iconBtn("act-edit", "edit", "修改");
    const delBtn = iconBtn("act-del", "trash", "删除");
    actions.append(doneBtn, editBtn, delBtn);
    foot.append(actions);
    card.append(foot);

    if (item.done) card.append(el("span", "stamp", "已实现"));
    return card;
  }

  function renderGrid() {
    const grid = $("#grid");
    const list = visibleItems();
    grid.textContent = "";

    const empty = $("#empty");
    if (!list.length) {
      empty.hidden = false;
      const cat = filter !== "all" ? CAT_MAP.get(filter) : null;
      $("#emptyTitle").textContent = cat ? "「" + cat.name + "」还空着" : "本子还空着呢";
      $("#emptySub").textContent = hideDone
        ? "未实现的都在这儿啦，去把它们一个个实现吧。"
        : "写一条吧，臭臭在等呢。";
      $("img", empty).src = filter === "food" ? IMG.snack : IMG.duo;
      return;
    }
    empty.hidden = true;

    list.forEach((item) => grid.append(cardNode(item)));
  }

  function render() {
    renderStats();
    renderTabs();
    renderGrid();
  }

  /* ---------------- compose ---------------- */

  let activeCat = "todo";

  function renderCatPicker() {
    const wrap = $("#catPicker");
    wrap.textContent = "";
    CATS.forEach((c) => {
      const b = el("button", "cat-pill");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(activeCat === c.id));
      b.dataset.cat = c.id;
      b.append(el("span", "", c.icon), el("span", "", c.name));
      wrap.append(b);
    });
  }

  function setActiveCat(id, focus) {
    activeCat = id;
    document.querySelectorAll(".cat-pill").forEach((b) => {
      b.setAttribute("aria-checked", String(b.dataset.cat === id));
    });
    const ta = $("#wishInput");
    ta.placeholder = CAT_MAP.get(id).placeholder;
    if (focus) ta.focus();
  }

  function addWish() {
    const ta = $("#wishInput");
    const text = ta.value.trim().replace(/\s+\n/g, "\n");
    if (!text) {
      ta.focus();
      toast("先写点什么呀，哪怕是三个字");
      return;
    }
    const item = {
      id: uid(),
      cat: activeCat,
      text,
      done: false,
      pinned: false,
      createdAt: Date.now(),
      doneAt: null,
    };
    items.push(item);
    save();
    ta.value = "";
    updateCounter();
    if (filter !== "all" && filter !== item.cat) {
      filter = item.cat;
    }
    render();
    toast("记下来啦 ♡ 臭臭会看到的");
    const first = $('.card[data-id="' + item.id + '"]');
    if (first) {
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      first.animate(
        [
          { transform: "scale(0.97)", boxShadow: "0 0 0 3px rgba(214,120,140,.35)" },
          { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(214,120,140,0)" },
        ],
        { duration: 700, easing: "ease-out" }
      );
    }
  }

  function updateCounter() {
    const ta = $("#wishInput");
    const n = ta.value.length;
    const c = $("#charCount");
    c.textContent = n + " / " + MAX;
    c.classList.toggle("is-near", n > MAX * 0.85);
  }

  /* ---------------- item actions ---------------- */

  function findItem(id) {
    return items.find((x) => x.id === id);
  }

  function toggleDone(id, origin) {
    const it = findItem(id);
    if (!it) return;
    it.done = !it.done;
    it.doneAt = it.done ? Date.now() : null;
    if (it.done) it.pinned = false;
    save();
    render();
    if (it.done) {
      burst(origin);
      toast("又实现一件 ♡");
    }
  }

  function togglePin(id) {
    const it = findItem(id);
    if (!it) return;
    it.pinned = !it.pinned;
    save();
    render();
    toast(it.pinned ? "已置顶，臭臭会先看到" : "已取消置顶");
  }

  function removeItem(id) {
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    lastDeleted = { item: items[idx], idx };
    items.splice(idx, 1);
    save();
    render();
    toast("删掉了一条", "撤销", () => {
      if (!lastDeleted) return;
      items.splice(Math.min(lastDeleted.idx, items.length), 0, lastDeleted.item);
      lastDeleted = null;
      save();
      render();
    });
  }

  function startEdit(card, id) {
    const it = findItem(id);
    if (!it || editingId) return;
    editingId = id;
    const p = $(".card-text", card);
    const ta = el("textarea", "card-editor");
    ta.value = it.text;
    ta.maxLength = 240;
    ta.setAttribute("aria-label", "修改这条心愿");
    p.replaceWith(ta);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);

    let closed = false;
    const finish = (commit) => {
      if (closed) return;
      closed = true;
      editingId = null;
      const val = ta.value.trim();
      if (commit && val && val !== it.text) {
        it.text = val;
        save();
        render();
        toast("改好啦");
      } else {
        render();
      }
    };

    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        finish(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    });
    ta.addEventListener("blur", () => finish(true));
  }

  function burst(originEl) {
    if (!originEl || !originEl.getBoundingClientRect) return;
    const r = originEl.getBoundingClientRect();
    const glyphs = ["♡", "✿", "♡", "❀"];
    for (let i = 0; i < 9; i++) {
      const s = el("span", "heart-burst", glyphs[i % glyphs.length]);
      s.style.left = r.left + r.width / 2 + "px";
      s.style.top = r.top + r.height / 2 + "px";
      s.style.setProperty("--dx", Math.round((Math.random() - 0.5) * 130) + "px");
      s.style.setProperty("--dy", Math.round(-40 - Math.random() * 80) + "px");
      s.style.animationDelay = i * 30 + "ms";
      document.body.append(s);
      setTimeout(() => s.remove(), 1100);
    }
  }

  /* ---------------- random pick ---------------- */

  function randomPick() {
    const pool = items.filter((x) => !x.done);
    if (!pool.length) {
      toast("还没有没实现的心愿呢，先写一条吧");
      return;
    }
    const dialog = $("#pickDialog");
    const show = () => {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      $("#pickCat").textContent = CAT_MAP.get(pick.cat).name + " · " + CAT_MAP.get(pick.cat).tagline;
      $("#pickText").textContent = pick.text;
      $("#pickArt").src = pick.cat === "food" ? IMG.snack : Math.random() > 0.5 ? IMG.duo : IMG.berry;
      dialog.dataset.id = pick.id;
    };
    show();
    if (!dialog.open) dialog.showModal();
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    }, { once: true });
  }

  /* ---------------- backup ---------------- */

  function exportData() {
    const data = { app: "xiangwish", version: 1, exportedAt: new Date().toISOString(), items };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    a.href = URL.createObjectURL(blob);
    a.download = "香香的心愿本-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("备份导出好啦");
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const list = Array.isArray(data) ? data : data.items;
        if (!Array.isArray(list)) throw new Error("bad");
        const clean = list.filter((x) => x && x.id && x.text && CAT_MAP.has(x.cat));
        if (!clean.length) throw new Error("empty");
        const map = new Map(items.map((x) => [x.id, x]));
        clean.forEach((x) => map.set(x.id, { ...map.get(x.id), ...x }));
        items = Array.from(map.values());
        save();
        render();
        toast("导入完成，多了 " + clean.length + " 条");
      } catch (e) {
        toast("这个文件读不懂，换一个试试");
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- wiring ---------------- */

  function init() {
    load();
    loadUI();
    if (filter !== "all") activeCat = filter;
    renderCatPicker();
    setActiveCat(activeCat, false);
    render();
    $("#hideDone").checked = hideDone;

    // topbar shadow
    const topbar = $(".topbar");
    const onScroll = () => topbar.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // category picker
    $("#catPicker").addEventListener("click", (e) => {
      const b = e.target.closest(".cat-pill");
      if (!b) return;
      setActiveCat(b.dataset.cat, true);
    });

    // compose
    const ta = $("#wishInput");
    ta.addEventListener("input", updateCounter);
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        addWish();
      }
    });
    $("#addWish").addEventListener("click", addWish);

    // tabs
    $("#tabs").addEventListener("click", (e) => {
      const b = e.target.closest(".tab");
      if (!b) return;
      filter = b.dataset.filter;
      saveUI();
      render();
    });

    // grid actions
    $("#grid").addEventListener("click", (e) => {
      const btn = e.target.closest(".icon-btn");
      const card = e.target.closest(".card");
      if (!card) return;
      const id = card.dataset.id;
      if (!btn) {
        if (!editingId) startEdit(card, id);
        return;
      }
      if (btn.classList.contains("act-pin")) togglePin(id);
      else if (btn.classList.contains("act-done")) toggleDone(id, btn);
      else if (btn.classList.contains("act-edit")) startEdit(card, id);
      else if (btn.classList.contains("act-del")) removeItem(id);
    });

    // hide done
    $("#hideDone").addEventListener("change", (e) => {
      hideDone = e.target.checked;
      saveUI();
      renderGrid();
      renderStats();
    });

    // "/" 快速开始
    document.addEventListener("keydown", (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        const ta = $("#wishInput");
        ta.scrollIntoView({ behavior: "smooth", block: "center" });
        ta.focus({ preventScroll: true });
      }
    });

    // random
    $("#randomTop").addEventListener("click", randomPick);
    $("#randomHero").addEventListener("click", randomPick);
    $("#randomBoard").addEventListener("click", randomPick);
    $("#pickAgain").addEventListener("click", () => {
      const pool = items.filter((x) => !x.done);
      if (!pool.length) return;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      $("#pickCat").textContent = CAT_MAP.get(pick.cat).name + " · " + CAT_MAP.get(pick.cat).tagline;
      $("#pickText").textContent = pick.text;
      $("#pickArt").src = pick.cat === "food" ? IMG.snack : Math.random() > 0.5 ? IMG.duo : IMG.berry;
    });
    $("#pickClose").addEventListener("click", () => $("#pickDialog").close());

    // backup
    $("#exportBtn").addEventListener("click", exportData);
    $("#importInput").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importData(f);
      e.target.value = "";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
