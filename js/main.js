/* ============================================================
   電気の困った相談窓口（仮称） メインスクリプト
   依存ライブラリなし（軽量・高速表示のため素のJSで実装）
   ============================================================ */
(function () {
  "use strict";

  /* ---------- タブ切り替え（お困りごと／将来のリスクなど、共通処理） ---------- */
  function initTabGroup(tabSelector, panelSelector) {
    var tabs = document.querySelectorAll(tabSelector);
    var panels = document.querySelectorAll(panelSelector);
    if (!tabs.length || !panels.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-target");

        tabs.forEach(function (t) { t.classList.remove("is-active"); });
        tab.classList.add("is-active");

        panels.forEach(function (panel) {
          panel.classList.toggle("is-active", panel.id === target);
        });
      });
    });
  }

  /* ---------- FAQ アコーディオン ---------- */
  function initFaqAccordion() {
    var items = document.querySelectorAll(".faq-item");
    if (!items.length) return;

    items.forEach(function (item) {
      var question = item.querySelector(".faq-question");
      var answer = item.querySelector(".faq-answer");
      if (!question || !answer) return;

      question.addEventListener("click", function () {
        var isOpen = item.classList.contains("is-open");

        // アコーディオンは複数同時展開OK（回答を探しやすくするため）
        if (isOpen) {
          item.classList.remove("is-open");
          answer.style.maxHeight = null;
          question.setAttribute("aria-expanded", "false");
        } else {
          item.classList.add("is-open");
          answer.style.maxHeight = answer.scrollHeight + "px";
          question.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ---------- お問い合わせフォーム：簡易バリデーション ---------- */
  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      var requiredFields = form.querySelectorAll("[required]");
      var firstInvalid = null;

      requiredFields.forEach(function (field) {
        var valid = field.checkValidity();
        field.classList.toggle("is-invalid", !valid);
        if (!valid && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        e.preventDefault();
        firstInvalid.focus();
      }
    });
  }

  /* ---------- 郵便番号から住所検索（zipcloud API、無料・登録不要） ---------- */
  function initZipcodeLookup() {
    var zipInput = document.getElementById("zipcode");
    var searchBtn = document.getElementById("zipcode-search");
    var prefInput = document.getElementById("prefecture");
    var cityInput = document.getElementById("city");
    var statusEl = document.getElementById("zipcode-status");
    if (!zipInput || !searchBtn || !prefInput || !cityInput) return;

    function setStatus(text, type) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.classList.remove("is-error", "is-success");
      if (type) statusEl.classList.add(type);
    }

    function lookup() {
      var code = zipInput.value.replace(/[^0-9]/g, "");
      if (code.length !== 7) {
        setStatus("郵便番号は7桁で入力してください（ハイフンなし）", "is-error");
        return;
      }
      setStatus("住所を検索中...");
      fetch("https://zipcloud.ibsnet.co.jp/api/search?zipcode=" + code)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.status !== 200 || !data.results || !data.results.length) {
            setStatus("該当する住所が見つかりませんでした。直接入力してください", "is-error");
            return;
          }
          var r = data.results[0];
          prefInput.value = r.address1;
          cityInput.value = r.address2 + r.address3;
          setStatus("住所を入力しました", "is-success");
        })
        .catch(function () {
          setStatus("検索に失敗しました。お手数ですが直接入力してください", "is-error");
        });
    }

    searchBtn.addEventListener("click", lookup);
    zipInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        lookup();
      }
    });
  }

  /* ---------- ヘッダー：スクロールで影を付与 ---------- */
  function initHeaderShadow() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    window.addEventListener(
      "scroll",
      function () {
        header.style.boxShadow = window.scrollY > 4 ? "0 2px 10px rgba(0,0,0,0.06)" : "none";
      },
      { passive: true }
    );
  }

  /* ---------- コラム一覧：タグ絞り込み ---------- */
  function initArticleFilter() {
    var filterBar = document.getElementById("article-tag-filter");
    var grid = document.getElementById("article-grid");
    var emptyMsg = document.getElementById("article-empty");
    if (!filterBar || !grid) return;

    var buttons = filterBar.querySelectorAll("button");
    var cards = grid.querySelectorAll(".article-card");

    function applyFilter(tag) {
      var visibleCount = 0;
      cards.forEach(function (card) {
        var tags = (card.getAttribute("data-tags") || "").split(/\s+/);
        var show = tag === "all" || tags.indexOf(tag) !== -1;
        card.hidden = !show;
        if (show) visibleCount++;
      });
      if (emptyMsg) emptyMsg.hidden = cards.length === 0 ? false : visibleCount > 0;
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        applyFilter(btn.getAttribute("data-tag"));
      });
    });

    applyFilter("all");
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTabGroup(".pain-tab", ".pain-panel");
    initTabGroup(".risk-tab", ".risk-panel");
    initFaqAccordion();
    initContactForm();
    initZipcodeLookup();
    initHeaderShadow();
    initArticleFilter();
  });
})();
