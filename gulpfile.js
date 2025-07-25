const { src, dest, watch, parallel } = require("gulp");
const browserSync = require("browser-sync").create();
const sass = require("gulp-sass")(require("sass"));
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const imagemin = require("gulp-imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const nunjucks = require("gulp-nunjucks");
const color = require("gulp-color");
const nodePath = require("path");

/**
 * Configuration
 */
let cssDir = "../../public/assets/css",
  jsDir = "../../public/assets/js",
  htmlDir = "src/pages",
  scssDir = "src/scss",
  imgDir = "../../public/assets/img";

let jsPathPattern = "/**/*.js",
  htmlPathPattern = "/**/*.html",
  scssPathPattern = "/**/*.scss",
  imgPathPattern = "/**/*.*";

/**
 * Helpers
 */
function _compileToHTML(path, onEnd, log = true, ret = false) {
  if (log) _log("[HTML] Compiling: " + path, "GREEN");

  let compileToHTML = src(path, { base: htmlDir })
    .pipe(plumber())
    .pipe(
      nunjucks.compile(
        {
          version: "2.3.0",
          site_name: "Stisla"
        },
        {
          trimBlocks: true,
          lstripBlocks: true,
          filters: {
            is_active: (str, reg, page) => {
              reg = new RegExp(reg, "gm");
              reg = reg.exec(page);
              if (reg != null) return str;
            }
          }
        }
      )
    )
    .on("error", console.error.bind(console))
    .on("end", () => {
      if (onEnd) onEnd.call(this);
      if (log) _log("[HTML] Finished", "GREEN");
    })
    .pipe(dest("pages"))
    .pipe(plumber.stop());

  if (ret) return compileToHTML;
}

function _compileToSCSS(path, onEnd, log = true, ret = false) {
  if (log) _log("[SCSS] Compiling:" + path, "GREEN");

  let compileToSCSS = src(path)
    .pipe(plumber())
    .pipe(
      sass({
        errorLogToConsole: true
      })
    )
    .on("error", console.error.bind(console))
    .on("end", () => {
      if (onEnd) onEnd.call(this);
      if (log) _log("[SCSS] Finished", "GREEN");
    })
    .pipe(
      rename({
        dirname: "",
        extname: ".css"
      })
    )
    .pipe(postcss([autoprefixer()]))
    .pipe(dest(cssDir))
    .pipe(plumber.stop());

  if (ret) return compileToSCSS;
}

function _log(str, clr) {
  if (!clr) clr = "WHITE";
  console.log(color(str, clr));
}

/**
 * Tasks
 */
function scripts() {
  return src("assets/js" + jsPathPattern)
    .pipe(plumber())
    .pipe(dest(jsDir))
    .pipe(plumber.stop());
}

function image() {
  return src("assets/img" + imgPathPattern)
    .pipe(plumber())
    .pipe(imagemin([imageminMozjpeg({ quality: 80 })]))
    .pipe(dest(imgDir))
    .pipe(plumber.stop());
}

function compileToSCSS() {
  return _compileToSCSS(scssDir + scssPathPattern, null, false, true);
}

function compileToHTML() {
  return _compileToHTML(htmlDir + htmlPathPattern, null, false, true);
}

function copyNodeModules() {
  return src("node_modules/**/*", { base: "node_modules" })
    .pipe(dest("../../public/node_modules"));
}

function watching() {
  compileToSCSS();
  compileToHTML();
  scripts();
  image();

  browserSync.init({
    server: {
      baseDir: "./"
    },
    startPath: "pages/index.html",
    port: 8080
  });

  watch(
    [htmlDir + htmlPathPattern, scssDir + scssPathPattern, "assets/js" + jsPathPattern, "assets/img" + imgPathPattern]
  ).on("change", (file) => {
    file = file.replace(/\\/g, nodePath.sep);

    if (file.indexOf(".scss") > -1) {
      _compileToSCSS(scssDir + scssPathPattern, () => browserSync.reload());
    }

    if (file.indexOf("layouts") > -1 && file.indexOf(".html") > -1) {
      _compileToHTML(htmlDir + htmlPathPattern, () => browserSync.reload());
    } else if (file.indexOf(".html") > -1) {
      _compileToHTML(file, () => browserSync.reload());
    }

    if (file.indexOf("assets/js") > -1) {
      scripts();
      browserSync.reload();
    }

    if (file.indexOf("assets/img") > -1) {
      image();
      browserSync.reload();
    }
  });
}

Object.assign(exports, {
  image,
  scripts,
  vendor: copyNodeModules,
  scss: compileToSCSS,
  html: compileToHTML,
  dist: parallel(compileToSCSS, compileToHTML, scripts, image),
  default: watching
});
