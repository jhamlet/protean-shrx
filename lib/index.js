var protean = require('protean'),
    _       = require('underscore'),
    Rx      = require('rx'),
    // path    = require('path'),
    fs      = require('fs'),
    del     = require('del'),
    globby  = require('globby'),
    Observable = Rx.Observable,
    // create  = Observable.create,
    fromArray = Observable.fromArray,
    fromNodeCallback = Observable.fromNodeCallback,
    argArray = _.compose(_.toArray.bind(_), _.flatten.bind(_)),
    exists  = Observable.fromCallback(fs.exists),
    glob    = fromNodeCallback(globby),
    rename  = fromNodeCallback(fs.rename),
    unlink  = 
        fromNodeCallback(del).
        select(Observable.fromArray).
        concatAll(),
    stat    = fromNodeCallback(fs.stat),
    readdir = fromNodeCallback(fs.readdir);

protean.augment(exports, {
    /**
     * @param {...String} path
     * @returns {external:Rx.Observable<Boolean>}
     */
    exists: function () {
        return fromArray(glob(argArray(arguments))).
            select(exists).
            concatAll();
    },
    /**
     * @param {String} from
     * @param {String} to
     * @returns {external:Rx.Observable}
     */
    mv: rename,
    /**
     * @param {...String} filepath
     * @returns {external:Rx.Observable}
     */
    rm: function () {
        return unlink(_.flatten(_.toArray(arguments)));
    },
    /**
     * @param {...String} filepath
     * @returns {external:Rx.Observable<String>}
     */
    rmrf: function (filepath) {
    },
    /**
     * @param {String} filepath
     * @returns {external:Rx.Observable<fs.Stats>}
     */
    stat: stat,
    /**
     * @param {String} dirpath
     * @returns {external:Rx.Observable<String>}
     */
    readdir: function (dirpath) {
        return readdir(dirpath).
            selectMany(Observable.fromArray);
    }
});
