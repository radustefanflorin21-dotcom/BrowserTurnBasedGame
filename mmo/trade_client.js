/**
 * Player trade UI — slots, gold, dual confirm over presence WebSocket.
 */
(function (root) {
  const TRADE_SLOTS = 8;
  let activeTrade = null;
  let localOffer = { gold: 0, items: [] };
  let offerDirty = false;
  let offerSyncTimer = null;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function itemIconHtml(name) {
    if (typeof getItemIconUrl === "function") {
      const src = getItemIconUrl(name);
      return `<img class="trade-slot-img" src="${escapeAttr(src)}" alt="" draggable="false" />`;
    }
    return "";
  }

  function normalizeLocalItems(items) {
    const out = [];
    (Array.isArray(items) ? items : []).slice(0, TRADE_SLOTS).forEach((entry) => {
      if (typeof entry === "string" && entry.trim()) out.push({ name: entry.trim(), quantity: 1 });
      else if (entry && typeof entry.name === "string" && entry.name.trim()) {
        out.push({
          name: entry.name.trim(),
          quantity: Math.max(1, Math.min(999, Math.floor(Number(entry.quantity) || 1)))
        });
      }
    });
    return out;
  }

  function countInInventory(itemName, qty) {
    if (!player || !Array.isArray(player.inventory)) return false;
    const want = String(itemName || "").trim();
    const needQty = Math.max(1, Math.floor(Number(qty) || 1));
    if (typeof getItemBaseName === "function" && typeof getMarketItemMeta === "function") {
      const meta = getMarketItemMeta(want);
      if (meta && meta.stackable) {
        const base = getItemBaseName(want);
        let c = 0;
        player.inventory.forEach((n) => {
          if (typeof n === "string" && getItemBaseName(n) === base) c++;
        });
        return c >= needQty;
      }
    }
    return player.inventory.filter((n) => typeof n === "string" && n.trim() === want).length >= needQty;
  }

  function scheduleOfferSync() {
    offerDirty = true;
    if (offerSyncTimer) clearTimeout(offerSyncTimer);
    offerSyncTimer = setTimeout(() => {
      offerSyncTimer = null;
      if (!activeTrade || !offerDirty) return;
      offerDirty = false;
      root.MMOPresence.sendTradeOffer({
        gold: localOffer.gold,
        items: localOffer.items
      });
    }, 200);
  }

  function renderTradeModal() {
    const modal = root.document.getElementById("tradeSessionModal");
    const body = root.document.getElementById("tradeSessionBody");
    if (!modal || !body || !activeTrade) return;

    const t = activeTrade;
    const myGoldMax = typeof player?.gold === "number" ? Math.max(0, Math.floor(player.gold)) : 0;
    const theirItems = normalizeLocalItems(t.theirOffer?.items);
    const myItems = normalizeLocalItems(localOffer.items);

    let mySlots = "";
    for (let i = 0; i < TRADE_SLOTS; i++) {
      const it = myItems[i];
      if (it) {
        const qty = it.quantity > 1 ? `<span class="trade-slot-qty">${it.quantity}</span>` : "";
        mySlots += `<div class="trade-slot trade-slot--filled" data-trade-slot="${i}" data-item-name="${escapeAttr(it.name)}" title="${escapeAttr(it.name)}">${itemIconHtml(it.name)}${qty}<button type="button" class="trade-slot-remove" data-trade-remove="${i}" aria-label="Remove">×</button></div>`;
      } else {
        mySlots += `<div class="trade-slot trade-slot--empty trade-slot-drop" data-trade-slot="${i}" data-trade-drop="1"></div>`;
      }
    }

    let theirSlots = "";
    for (let i = 0; i < TRADE_SLOTS; i++) {
      const it = theirItems[i];
      if (it) {
        const qty = it.quantity > 1 ? `<span class="trade-slot-qty">${it.quantity}</span>` : "";
        theirSlots += `<div class="trade-slot trade-slot--filled trade-slot--readonly" title="${escapeAttr(it.name)}">${itemIconHtml(it.name)}${qty}</div>`;
      } else {
        theirSlots += `<div class="trade-slot trade-slot--empty trade-slot--readonly"></div>`;
      }
    }

    const myConfirmed = !!t.myOffer?.confirmed;
    const theirConfirmed = !!t.theirOffer?.confirmed;

    body.innerHTML = `
      <div class="trade-session-grid">
        <div class="trade-session-col">
          <h4 class="trade-session-col-title">Your offer</h4>
          <div class="trade-slots">${mySlots}</div>
          <label class="trade-gold-row">Gold <input type="number" id="tradeGoldInput" class="trade-gold-input" min="0" max="${myGoldMax}" value="${localOffer.gold || 0}" /></label>
          <p class="muted trade-gold-hint">You have ${myGoldMax} gold</p>
          <button type="button" id="tradeConfirmBtn" class="btn-primary"${myConfirmed ? " disabled" : ""}>${myConfirmed ? "Confirmed" : "Confirm trade"}</button>
        </div>
        <div class="trade-session-col">
          <h4 class="trade-session-col-title">${escapeHtml(t.partnerName || "Partner")}'s offer</h4>
          <div class="trade-slots">${theirSlots}</div>
          <p class="trade-gold-row trade-gold-row--readonly">Gold: <strong>${Math.max(0, Math.floor(t.theirOffer?.gold || 0))}</strong></p>
          <p class="muted">${theirConfirmed ? "Partner confirmed." : "Waiting for partner to confirm…"}</p>
        </div>
      </div>
      <p class="muted trade-session-hint">Drag items from your inventory into your trade slots. Your partner cannot see your inventory.</p>
      <div class="modal-compact-actions">
        <button type="button" id="tradeCancelBtn" class="btn-secondary">Cancel trade</button>
      </div>`;

    const goldInput = body.querySelector("#tradeGoldInput");
    if (goldInput) {
      goldInput.onchange = () => {
        const max = myGoldMax;
        localOffer.gold = Math.max(0, Math.min(max, Math.floor(Number(goldInput.value) || 0)));
        goldInput.value = String(localOffer.gold);
        scheduleOfferSync();
      };
    }

    body.querySelectorAll("[data-trade-remove]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute("data-trade-remove"), 10);
        if (!Number.isFinite(idx)) return;
        localOffer.items.splice(idx, 1);
        renderTradeModal();
        scheduleOfferSync();
      });
    });

    const confirmBtn = body.querySelector("#tradeConfirmBtn");
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        if (offerSyncTimer) {
          clearTimeout(offerSyncTimer);
          offerSyncTimer = null;
          offerDirty = false;
          root.MMOPresence.sendTradeOffer({ gold: localOffer.gold, items: localOffer.items });
        }
        root.MMOPresence.confirmTrade();
      };
    }
    const cancelBtn = body.querySelector("#tradeCancelBtn");
    if (cancelBtn) {
      cancelBtn.onclick = () => root.MMOPresence.cancelTrade();
    }

    modal.classList.remove("hidden");
  }

  function hideTradeModal() {
    const modal = root.document.getElementById("tradeSessionModal");
    if (modal) modal.classList.add("hidden");
    activeTrade = null;
    localOffer = { gold: 0, items: [] };
    offerDirty = false;
    if (offerSyncTimer) {
      clearTimeout(offerSyncTimer);
      offerSyncTimer = null;
    }
  }

  function showTradeInviteModal(fromName) {
    const modal = root.document.getElementById("tradeInviteModal");
    const text = root.document.getElementById("tradeInviteText");
    if (text) text.textContent = `${fromName || "A player"} wants to trade with you.`;
    if (modal) modal.classList.remove("hidden");
  }

  function hideTradeInviteModal() {
    const modal = root.document.getElementById("tradeInviteModal");
    if (modal) modal.classList.add("hidden");
  }

  function applyTradeState(trade) {
    if (!trade || !trade.sessionId) return;
    activeTrade = trade;
    if (trade.myOffer && !offerDirty) {
      localOffer = {
        gold: Math.max(0, Math.floor(trade.myOffer.gold || 0)),
        items: normalizeLocalItems(trade.myOffer.items)
      };
    }
    renderTradeModal();
  }

  function addItemToTrade(itemName, quantity) {
    if (!activeTrade || !itemName) return false;
    const name = String(itemName).trim();
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    if (localOffer.items.length >= TRADE_SLOTS) return false;
    if (!countInInventory(name, qty)) return false;
    localOffer.items.push({ name, quantity: qty });
    renderTradeModal();
    scheduleOfferSync();
    return true;
  }

  function initTradeUi() {
    const accept = root.document.getElementById("tradeInviteAcceptBtn");
    const decline = root.document.getElementById("tradeInviteDeclineBtn");
    if (accept && accept.dataset.bound !== "1") {
      accept.dataset.bound = "1";
      accept.addEventListener("click", () => {
        hideTradeInviteModal();
        root.MMOPresence.acceptTradeInvite();
      });
    }
    if (decline && decline.dataset.bound !== "1") {
      decline.dataset.bound = "1";
      decline.addEventListener("click", () => {
        hideTradeInviteModal();
        root.MMOPresence.declineTradeInvite();
      });
    }
    const tradeModal = root.document.getElementById("tradeSessionModal");
    if (tradeModal && tradeModal.dataset.dndBound !== "1") {
      tradeModal.dataset.dndBound = "1";
      tradeModal.addEventListener("dragover", (e) => {
        if (!activeTrade) return;
        if (e.target.closest(".trade-slot-drop")) {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        }
      });
      tradeModal.addEventListener("drop", (e) => {
        if (!activeTrade) return;
        const slot = e.target.closest(".trade-slot-drop");
        if (!slot) return;
        e.preventDefault();
        e.stopPropagation();
        const item = e.dataTransfer?.getData("text/plain");
        if (!item || !item.trim()) return;
        let qty = 1;
        const rawQty = e.dataTransfer?.getData("application/x-trade-qty");
        if (rawQty) qty = Math.max(1, Math.floor(Number(rawQty) || 1));
        addItemToTrade(item.trim(), qty);
      });
    }
  }

  root.MMOTrade = {
    init: initTradeUi,
    isActive: () => !!activeTrade,
    showInvite: showTradeInviteModal,
    hideInvite: hideTradeInviteModal,
    applyState: applyTradeState,
    close: hideTradeModal,
    addItem: addItemToTrade,
    onComplete: async (msg) => {
      hideTradeModal();
      if (msg.roster && typeof applyOnlineActionResponse === "function") {
        await applyOnlineActionResponse({ roster: msg.roster, revision: msg.revision });
      }
      if (typeof render === "function") render();
      if (root.MMOChat?.appendSystem) root.MMOChat.appendSystem("Trade complete!");
    },
    onClosed: () => {
      hideTradeModal();
      if (root.MMOChat?.appendSystem) root.MMOChat.appendSystem("Trade cancelled.");
    }
  };

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", initTradeUi);
  } else {
    initTradeUi();
  }
})(typeof window !== "undefined" ? window : globalThis);
