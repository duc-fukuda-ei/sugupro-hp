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

  /* ---------- 写真添付：送信前にブラウザ側で自動縮小 ----------
     FormSubmitの添付上限が合計10MBのため、スマホ写真をそのまま送ると
     2〜3枚で上限を超えて送信が失敗する。選択時に縮小して差し替える。 */
  function initPhotoUpload() {
    var input = document.getElementById("photos");
    var list = document.getElementById("photo-list");
    var errorEl = document.getElementById("photo-error");
    var form = document.getElementById("contact-form");
    var slotWrap = document.getElementById("photo-slots");
    if (!input || !list || !errorEl || !form || !slotWrap) return;

    var slots = slotWrap.querySelectorAll('input[type="file"]');
    var MAX_FILES = slots.length;
    var MAX_DIMENSION = 1600;
    var JPEG_QUALITY = 0.8;
    var TOTAL_LIMIT = 9 * 1024 * 1024; // 10MBの手前で余裕を持たせる
    var canReplaceFiles = typeof DataTransfer !== "undefined";
    var busy = false;

    // FormSubmitは1つの入力欄につき1ファイルしか受け取らないため、1枚ずつ別の欄に入れる
    function fillSlots(files) {
      Array.prototype.forEach.call(slots, function (slot, i) {
        var dt = new DataTransfer();
        if (files[i]) dt.items.add(files[i]);
        slot.files = dt.files;
      });
    }

    function clearSlots() {
      if (!canReplaceFiles) return;
      fillSlots([]);
    }

    function formatSize(bytes) {
      if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + "KB";
      return (bytes / 1024 / 1024).toFixed(1) + "MB";
    }

    function showError(message) {
      errorEl.textContent = message;
      errorEl.hidden = !message;
    }

    function render(files, note) {
      list.innerHTML = "";
      var total = 0;
      Array.prototype.forEach.call(files, function (file) {
        total += file.size;
        var li = document.createElement("li");
        li.textContent = file.name + "（" + formatSize(file.size) + "）";
        list.appendChild(li);
      });
      if (files.length) {
        var summary = document.createElement("li");
        summary.className = "photo-list-total";
        summary.textContent = note || files.length + "枚・合計" + formatSize(total);
        list.appendChild(summary);
      }
      return total;
    }

    // 画像を縮小してJPEGに変換する。失敗した場合は元のファイルを返す。
    function compress(file) {
      if (!file.type || file.type.indexOf("image/") !== 0) {
        return Promise.resolve(file);
      }
      if (typeof createImageBitmap !== "function" || !window.Blob) {
        return Promise.resolve(file);
      }
      // imageOrientation未対応のブラウザでも落ちないよう、オプション付きで失敗したら素で再試行
      return createImageBitmap(file, { imageOrientation: "from-image" })
        .catch(function () { return createImageBitmap(file); })
        .then(function (bitmap) {
          var scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
          var w = Math.round(bitmap.width * scale);
          var h = Math.round(bitmap.height * scale);
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
          if (bitmap.close) bitmap.close();
          return new Promise(function (resolve) {
            canvas.toBlob(function (blob) {
              if (!blob || blob.size >= file.size) return resolve(file);
              var name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
              resolve(new File([blob], name, { type: "image/jpeg" }));
            }, "image/jpeg", JPEG_QUALITY);
          });
        })
        .catch(function () { return file; });
    }

    input.addEventListener("change", function () {
      var selected = Array.prototype.slice.call(input.files);
      showError("");
      clearSlots();
      if (!selected.length) { list.innerHTML = ""; return; }

      if (!canReplaceFiles) {
        showError("ご利用のブラウザでは写真を添付できません。お手数ですが、LINEから写真をお送りください。");
        list.innerHTML = "";
        return;
      }

      if (selected.length > MAX_FILES) {
        showError("写真は" + MAX_FILES + "枚までお送りいただけます。枚数を減らしてもう一度お選びください。");
        input.value = "";
        list.innerHTML = "";
        return;
      }

      busy = true;
      render(selected, "軽量化しています…");

      Promise.all(selected.map(compress)).then(function (processed) {
        var total = processed.reduce(function (sum, f) { return sum + f.size; }, 0);

        if (total > TOTAL_LIMIT) {
          showError("写真の合計サイズが大きすぎます（" + formatSize(total) + "）。枚数を減らしてお試しいただくか、LINEからお送りください。");
          clearSlots();
          render(processed);
          return;
        }

        fillSlots(processed);
        render(processed);
        showError("");
      })
      // 想定外の失敗でbusyが立ったままになると送信が永久にブロックされるため必ず解除する
      .catch(function () {
        clearSlots();
        showError("写真の処理に失敗しました。お手数ですが、LINEから写真をお送りください。");
        render(selected);
      })
      .then(function () { busy = false; });
    });

    form.addEventListener("submit", function (e) {
      if (busy) {
        e.preventDefault();
        showError("写真を処理しています。数秒お待ちのうえ、もう一度送信してください。");
        return;
      }
      if (!errorEl.hidden) {
        e.preventDefault();
        errorEl.scrollIntoView({ block: "center" });
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

  /* ---------- 記事ページ：控えめなスクロール表示演出 ---------- */
  function initScrollReveal() {
    var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var els = document.querySelectorAll(".reveal");
    if (!els.length || prefersReduced || !("IntersectionObserver" in window)) return;

    els.forEach(function (el) { el.classList.add("reveal-ready"); });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach(function (el) { io.observe(el); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTabGroup(".pain-tab", ".pain-panel");
    initTabGroup(".risk-tab", ".risk-panel");
    initFaqAccordion();
    initContactForm();
    initPhotoUpload();
    initZipcodeLookup();
    initHeaderShadow();
    initArticleFilter();
    initScrollReveal();
  });
})();
