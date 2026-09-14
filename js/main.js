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

  document.addEventListener("DOMContentLoaded", function () {
    initTabGroup(".pain-tab", ".pain-panel");
    initTabGroup(".risk-tab", ".risk-panel");
    initFaqAccordion();
    initContactForm();
    initHeaderShadow();
  });
})();
