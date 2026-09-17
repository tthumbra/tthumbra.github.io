/* ===================================================================
   Thermal person-presence classifier — browser demo.

   The model is a Teachable Machine export: MobileNetV2 alpha=0.35,
   GlobalAveragePooling, Dense(100, relu), Dense(2, softmax).

   Two things here are not guesses and must not be "tidied":

   1. CLASS ORDER. Index 0 is "person present". This is not recorded
      anywhere in the model file — the labels.txt was lost. It was
      recovered by running both known thermal frames through the model
      and checking which index responded to the one containing a person.
      Swap it and every prediction inverts, silently and confidently.

   2. PREPROCESSING. (pixel / 127.5) - 1, giving [-1, 1]. Feeding the
      raw 0-255 range instead flips the prediction on both test frames
      without throwing anything. Measured, not theorised.
   =================================================================== */

(function () {
  "use strict";

  var MODEL_URL = "assets/model/model.json";
  var SIZE = 224;

  // Index 0 = person. See note above before touching this.
  var CLASSES = ["person", "no person"];   // <= 13ch, so bars stay on one row

  var SAMPLES = [
    { id: "person", src: "assets/thermal-person.jpg",
      label: "Frame A", note: "contains a person" },
    { id: "empty", src: "assets/thermal-empty.jpg",
      label: "Frame B", note: "no person" }
  ];

  // [x, y, w, h] as fractions of the source image
  var REGIONS = {
    full:  { label: "full frame",  box: [0, 0, 1, 1] },
    left:  { label: "left half",   box: [0, 0, 0.5, 1] },
    right: { label: "right half",  box: [0.5, 0, 0.5, 1] }
  };

  var state = { sample: "person", region: "full", model: null, busy: false };
  var images = {};

  var $ = function (id) { return document.getElementById(id); };
  var tiles = $("tiles"), regions = $("regions"), runBtn = $("run"),
      statusEl = $("status"), canvas = $("input"), result = $("result");

  function setStatus(msg) { statusEl.textContent = msg || ""; }

  /* ---- preload the sample images so drawing is synchronous ---- */
  function preload() {
    return Promise.all(SAMPLES.map(function (s) {
      return new Promise(function (resolve, reject) {
        var im = new Image();
        im.onload = function () { images[s.id] = im; resolve(); };
        im.onerror = function () { reject(new Error("could not load " + s.src)); };
        im.src = s.src;
      });
    }));
  }

  /* ---- UI ---- */
  function buildTiles() {
    SAMPLES.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "demo-tile";
      b.setAttribute("aria-pressed", String(s.id === state.sample));
      b.innerHTML =
        '<img src="' + s.src + '" alt="Thermal frame: ' + s.note + '">' +
        '<span class="demo-tile-label">' + s.label +
        '<span class="dim"> &middot; ' + s.note + '</span></span>';
      b.addEventListener("click", function () {
        state.sample = s.id;
        syncPressed(tiles, s.id);
        draw();
        clearResult();
      });
      b.dataset.key = s.id;
      tiles.appendChild(b);
    });
  }

  function buildRegions() {
    Object.keys(REGIONS).forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "demo-region";
      b.textContent = REGIONS[k].label;
      b.dataset.key = k;
      b.setAttribute("aria-pressed", String(k === state.region));
      b.addEventListener("click", function () {
        state.region = k;
        syncPressed(regions, k);
        draw();
        clearResult();
      });
      regions.appendChild(b);
    });
  }

  function syncPressed(container, key) {
    Array.prototype.forEach.call(container.children, function (el) {
      el.setAttribute("aria-pressed", String(el.dataset.key === key));
    });
  }

  function clearResult() {
    result.innerHTML = '<p class="dim">Selection changed. Run it again.</p>';
  }

  /* ---- draw the selected crop into the 224x224 input canvas ---- */
  function draw() {
    var im = images[state.sample];
    if (!im) { return; }
    var box = REGIONS[state.region].box;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(
      im,
      box[0] * im.naturalWidth, box[1] * im.naturalHeight,
      box[2] * im.naturalWidth, box[3] * im.naturalHeight,
      0, 0, SIZE, SIZE
    );
  }

  /* ---- inference ---- */
  function classify() {
    if (state.busy) { return; }
    state.busy = true;
    runBtn.disabled = true;

    var load = state.model
      ? Promise.resolve(state.model)
      : (setStatus("loading model (~1.2 MB)…"),
         tf.loadLayersModel(MODEL_URL).then(function (m) {
           state.model = m;
           return m;
         }));

    load.then(function (model) {
      setStatus("classifying…");
      // tf.tidy disposes intermediate tensors; without it every run leaks
      // GPU memory until the context falls over.
      var probs = tf.tidy(function () {
        var x = tf.browser.fromPixels(canvas)   // [224,224,3], 0-255
          .toFloat()
          .div(127.5)
          .sub(1)                                // -> [-1, 1]
          .expandDims(0);
        return model.predict(x);
      });
      return probs.data().then(function (d) {
        probs.dispose();
        render(Array.prototype.slice.call(d));
      });
    }).catch(function (err) {
      result.innerHTML = '<p><strong>Failed:</strong> ' +
        String(err.message || err).replace(/[<>]/g, "") + "</p>";
    }).then(function () {
      state.busy = false;
      runBtn.disabled = false;
      setStatus("");
    });
  }

  /* ---- render probabilities as monospace bars ---- */
  function render(p) {
    var width = 18;   // fits the result column without wrapping the %
    var top = p[0] >= p[1] ? 0 : 1;
    var html = '<div class="demo-bars">';
    for (var i = 0; i < CLASSES.length; i++) {
      var filled = Math.round(p[i] * width);
      var bar = new Array(filled + 1).join("█") +
                new Array(width - filled + 1).join("·");
      html += '<div class="demo-bar' + (i === top ? " is-top" : "") + '">' +
              '<span class="demo-bar-label">' + CLASSES[i] + "</span>" +
              '<span class="demo-bar-track">' + bar + "</span>" +
              '<span class="demo-bar-pct">' + (p[i] * 100).toFixed(2) + "%</span>" +
              "</div>";
    }
    html += "</div>";
    html += '<p class="demo-verdict">&rarr; <strong>' + CLASSES[top] +
            "</strong> (" + REGIONS[state.region].label + " of " +
            SAMPLES.filter(function (s) { return s.id === state.sample; })[0].label +
            ")</p>";
    result.innerHTML = html;
  }

  /* ---- go ---- */
  if (typeof tf === "undefined") {
    result.innerHTML = "<p>TensorFlow.js did not load, so the demo can't run.</p>";
    runBtn.disabled = true;
    return;
  }

  buildTiles();
  buildRegions();
  runBtn.addEventListener("click", classify);

  preload().then(draw).catch(function (err) {
    result.innerHTML = "<p>Could not load the sample frames: " +
      String(err.message).replace(/[<>]/g, "") + "</p>";
    runBtn.disabled = true;
  });
}());
