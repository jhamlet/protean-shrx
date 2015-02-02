var protean = require('protean'),
    cp = require('child_process'),
    Rx = require('rx'),
    _ = require('underscore');

function SpawnSubject (cmd, args, opts) {
    this._command   = cmd;
    this._arguments = args;
    this._options   = opts;
    this._subject   = new Rx.Subject();

    if (opts && opts.encoding) {
        this.encoding = opts.encoding;
    }

    // pre-bind our event listeners
    this._next       = this._next.bind(this);
    this._error      = this._error.bind(this);
    this._exit       = this._exit.bind(this);
    this._close      = this._close.bind(this);
    // this._disconnect = this._disconnect.bind(this);
    // this._message    = this._message.bind(this);
}

protean.inherit(Rx.Observable, SpawnSubject,/** @lends SpawnSubject# */{
    onNext: function (input) {
        if (this._process && !this._subject.isStopped) {
            this._process.stdin.write(input);
        }
    },

    onError: function (signal) { this.stop(signal); },

    onCompleted: function () { this.stop(); },

    encoding: 'utf8',

    start: function () {
        var process;

        if (!this._process) {
            this._process = process =
                cp.spawn(this._command, this._arguments, this._options);

            process.stdout.on('data', this._next);
            process.stderr.on('data', this._next);

            process.on('error', this._error);
            process.on('exit', this._exit);
            process.on('close', this._close);
            // process.on('disconnect', this._disconnect);
            // process.on('message', this._message);
        }
    },

    stop: function (signal) {
        var s = this._subject,
            process;

        if (this._process && !s.isStopped) {
            process = this._process;

            if (signal) {
                process.kill(signal);
            }

            process.stdout.removeListener('data', this._next);
            process.stderr.removeListener('data', this._next);
            process.removeListener('error', this._error);
            process.removeListener('exit', this._exit);
            // process.removeListener('disconnect', this._disconnect);
            // process.removeListener('message', this._message);

            if (!s.isStopped) {
                s.onCompleted();
            }
        }
    },

    _subscribe: function () {
        var s = this._subject,
            sub = s.subscribe.apply(s, arguments);

        this.start();

        return sub;
    },

    _next: function (data) {
        if (this.encoding) {
            data = data.toString(this.encoding);
        }
        this._subject.onNext(data);
    },

    _error: function (error) { this._subject.onError(error); },

    _exit: function (/*code*/) { },

    _close: function (code) {
        var subject = this._subject;

        if (!subject.isStopped) {
            subject[code === null ? 'onError' : 'onCompleted']();
        }
    },

    _disconnect: function () { },

    _message: function (/*msg, handle*/) { }
});

/**
 * @param {String} cmd The command to run
 * @param {Array<String>} args Arguments for the command
 * @param {Object} opts Options object
 * @param {String} [opts.encoding='utf8'] Encoding to use for output. Default is
 * 'utf8'.
 * @param {String} opts.cwd
 * @param {ObjecT} opts.env
 * @param {Array|String} opts.stdio
 * @param {Boolean} opts.detached
 * @param {Number} opts.uid
 * @param {Number} opts.gid
 * @returns {SpawnSubject}
 */
module.exports = function spawn (cmd, args, opts) {
    var idx,
        command;

    if (!opts && !_.isArray(args)) {
        opts = args;
        args = null;
    }

    args = args || [];

    idx = cmd.indexOf(' ');

    if (idx > 0) {
        command = cmd.slice(0, idx);
        args.unshift(cmd.slice(idx + 1));
    }
    else {
        command = cmd;
    }

    return new SpawnSubject(command, args, opts);
};
