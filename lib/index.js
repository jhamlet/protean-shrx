var protean = require('protean'),
    _       = require('underscore'),
    Rx      = require('rx'),
    path    = require('path'),
    fs      = require('fs'),
    spawn   = require('./spawn'),
    Observable = Rx.Observable,
    // create  = Observable.create,
    fromArray = Observable.fromArray,
    fromNodeCallback = Observable.fromNodeCallback,
    toArray = _.toArray.bind(_),
    flatten = _.flatten.bind(_),
    argArray = _.compose(flatten, toArray),
    just    = function (arg) { return _.identity.bind(_, arg); },
    globby  = _.compose(fromNodeCallback(require('globby')), argArray),
    unlink  = _.compose(fromNodeCallback(require('del'), argArray)),
    rename  = fromNodeCallback(fs.rename),
    stat    = fromNodeCallback(fs.stat),
    readdir = fromNodeCallback(fs.readdir),
    dotRegex = /^\./,
    dotTest = dotRegex.test.bind(dotRegex),
    notLeadingDot  = _.negate(dotTest);

function invoke () {
    var args = toArray(arguments),
        method = args.shift();

    return function () {
        var list = toArray(arguments),
            obj = list.shift();

        return obj[method].apply(obj, args.concat(list));
    };
}

function prependPath (prefix) {
    return function (suffix) {
        return path.join(prefix, suffix);
    };
}

function mutate (values) {
    return function (obj) {
        return _.extend(obj, values);
    };
}

function glob () {
    return globby(arguments).
        select(fromArray).
        concatAll();
}

protean.augment(exports, {
    /**
     * @param {...Array<String>|String} pattern One or more glob-patterns, or
     * plain filepaths
     * @returns {external:Rx.Observable<String>} The filepath(s) that exist
     */
    glob: glob,
    /**
     * @param {String} from
     * @param {String} to
     * @returns {external:Rx.Observable}
     */
    mv: function (from, to) {
        return rename(from, to).
            select(just(to));
    },
    /**
     * @param {...Array<String>|String} pattern One or more glob-patterns,or
     * plain filepaths
     * @returns {external:Rx.Observable}
     */
    rm: function () {
        return unlink(arguments).
            selectMany(fromArray);
    },
    /**
     * @param {String} filepath
     * @returns {external:Rx.Observable<fs.Stats>}
     */
    stat: function () {
        return glob.apply(null, arguments).
            selectMany(function (filepath) {
                return stat(filepath).
                    select(mutate({ filepath: path.resolve(filepath) }));
            });
    },
    /**
     * @param {...Array<String>|String} pattern One or more glob-patterns, or
     * plain filepaths
     * @returns {external:Rx.Observable<String>}
     */
    ls: function () {
        return glob.apply(null, arguments).
            selectMany(function (filepath) {
                return stat(filepath).
                    where(invoke('isDirectory')).
                    select(just(filepath));
            }).
            selectMany(function (filepath) {
                return readdir(filepath).
                    selectMany(fromArray).
                    where(notLeadingDot).
                    select(prependPath(filepath));
            });
    },

    spawn: spawn,
    sh: spawn
});

exports.
    sh('ifconfig').
    subscribe(
        function (next) { console.log(next); },
        function (error) { throw error; }
    );
