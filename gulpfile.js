var gulp     = require('gulp'),
    ejs      = require('gulp-ejs'),
    clean    = require('del'),
    fs       = require('fs'),
    pkgInfo  = require('./package.json'),
    CLOBBER  = [];
    
gulp.task('clobber', function (done) {
    clean(CLOBBER, done);
});

gulp.task('readme', function () {
    return gulp.src('src/tmpl/README.ejs').
        pipe(ejs({
            pkg: pkgInfo,
            license: fs.readFileSync('LICENSE', 'utf8')
        }, {
            ext: '.md'
        })).
        pipe(gulp.dest('./'));
});
CLOBBER.push('README.md');

gulp.task('default', ['readme']);
