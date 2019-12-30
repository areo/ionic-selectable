const gulp = require('gulp'),
  uglify = require('gulp-uglify-es').default,
  rename = require('gulp-rename'),
  jsonEditor = require('gulp-json-editor'),
  fs = require('fs'),
  sass = require('gulp-sass'),
  path = require('path'),
  ngPackagr = require('ng-packagr'),
  ngPackagePath = path.normalize(path.join(__dirname, './ng-package.json')),
  tsConfigPath = path.normalize(path.join(__dirname, './tsconfig.dist.json')),
  paths = {
    gulp: 'node_modules/gulp/bin/gulp.js',
    ngPackagr: 'node_modules/ng-packagr/cli/main.js',
    images: {
      root: 'images/'
    },
    src: {
      css: `src/app/components/ionic-selectable/ionic-selectable.component.scss`
    },
    dist: {
      root: 'dist/',
      package: 'dist/package.json',
      bundles: {
        root: 'dist/bundles/',
        file: `dist/bundles/areo-ionic-selectable.umd.js`,
        mapFile: `dist/bundles/areo-ionic-selectable.umd.js.map`,
        minFile: `areo-ionic-selectable.umd.min.js`
      },
      esm5: {
        root: 'dist/esm5/',
        file: `dist/esm5/areo-ionic-selectable.js`,
        minFile: `areo-ionic-selectable.min.js`
      },
      esm2015: {
        root: 'dist/esm2015/',
        file: `dist/esm2015/areo-ionic-selectable.js`,
        minFile: `areo-ionic-selectable.min.js`
      }
    }
  };

async function copyCss() {
  return Promise.all([
    new Promise(function (resolve, reject) {
      // Copy original SCSS file to "module" folder from package.json.
      // That's where Ionic will be looking for it.
      fs.createReadStream(paths.src.css).pipe(
        fs.createWriteStream(`${paths.dist.esm5.root}ionic-selectable.component.scss`)
          .on('error', reject)
          .on('close', resolve)
      );
    }),
    new Promise(function (resolve, reject) {
      gulp.src(paths.src.css)
        // This is to create a minified CSS file in order to use in StackBlitz demos.
        // The minified file isn't required for component to work.
        .pipe(sass({
          outputStyle: 'compressed'
        }))
        .pipe(rename(`ionic-selectable.component.min.css`))
        .pipe(gulp.dest(paths.dist.esm5.root))
        .on('error', reject)
        .on('end', resolve);
    })
  ]);
}

async function copyImages() {
  return new Promise(function (resolve, reject) {
    gulp.src(`${paths.images.root}**/*`)
      .pipe(gulp.dest(`${paths.dist.root}${paths.images.root}`))
      .on('error', reject)
      .on('end', resolve);
  });
}

async function minifyJS() {
  // Minify files.
  return Promise.all([
    new Promise(function (resolve, reject) {
      gulp.src(paths.dist.esm5.file)
        .pipe(uglify())
        .on('error', reject)
        .pipe(rename(paths.dist.esm5.minFile))
        .pipe(gulp.dest(paths.dist.esm5.root))
        .on('error', reject)
        .on('end', resolve);
    }),
    new Promise(function (resolve, reject) {
      gulp.src(paths.dist.esm2015.file)
        .pipe(uglify())
        .on('error', reject)
        .pipe(rename(paths.dist.esm2015.minFile))
        .pipe(gulp.dest(paths.dist.esm2015.root))
        .on('error', reject)
        .on('end', resolve);
    })
  ]).then(function () {
    // Remove source files.
    fs.unlinkSync(paths.dist.bundles.file);
    fs.unlinkSync(paths.dist.bundles.mapFile);
    fs.unlinkSync(paths.dist.esm5.file);
    fs.unlinkSync(paths.dist.esm2015.file);
  });
}

async function modifyPackageJson() {
  return new Promise(function (resolve, reject) {
    gulp.src(paths.dist.package)
      .pipe(jsonEditor(function (json) {
        json.main = `bundles/${paths.dist.bundles.minFile}`;
        json.module = `esm5/${paths.dist.esm5.minFile}`;
        json.es2015 = `esm2015/${paths.dist.esm2015.minFile}`;
        delete json.cordova;
        delete json.devDependencies;
        delete json.dependencies;
        return json;
      }))
      .pipe(gulp.dest(paths.dist.root))
      .on('error', reject)
      .on('end', resolve);
  });
}

async function build() {
  await ngPackagr
    .ngPackagr()
    .forProject(ngPackagePath)
    .withTsConfig(tsConfigPath)
    .build()
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  await minifyJS();
  await modifyPackageJson();
  await copyCss();
  await copyImages();
}

gulp.task('build', build);
gulp.task('default', gulp.parallel('build'));
