    // External Dependencies
var _ = require('underscore'),
    http = require('http'),
    connect = require('connect'),
    socketio = require('socket.io'),
    path = require('path'),
    async = require('async'),
    fs = require('fs'),
    // Internal Dependencies
    classes = require('../classes'),
    // Shortcuts
    Class = classes.Class,
    // Declarations
    Server;

module.exports = new Class({
    
    // Interface ===============================================================
    
    init: function (options) {
        var self = this;
        options = options || {};
        self.pages = options.pages || {};
        self.staticDir = options.staticDir || self.staticDir;
        self.port = options.port || self.port;
        self.middleware = options.middleware || [];
        self.slots = options.slots || {};
    },
    
    addPage: function (name, content) {
        var self = this;
        self.pages[name] = content;
    },
    
    use: function (func) {
        var self = this;
        self.middleware.push(func);
    },
    
    addSlot: function (name, handler) {
        var self = this;
        self.slots[name] = handler;
    },
    
    listen: function (port) {
        var self = this;
        self.port = port || self.port;
        self.setServers();
        self.setConnectMiddleware();
        self.httpServer.listen(self.port);
        self.setSlots();
    },
    
    // Realization =============================================================
    
    setServers: function () {
        var self = this;
        self.connectServer = connect();
        self.httpServer = http.createServer(self.connectServer);
        self.ioServer = socketio.listen(self.httpServer);
        self.ioServer.set('log level', 0);
    },
    
    setConnectMiddleware: function () {
        var self = this;
        if (self.staticDir) {
            self.connectServer.use(connect.static(self.staticDir));
        }
        self.connectServer.use(_.bind(self.handleHTTPRequest, self));
    },
    
    handleHTTPRequest: function (request, response) {
        var self = this,
            path = request.url.split('?')[0],
            content,
            filename,
            code = 200;
        if (!(path.slice(-1) === '/')) {
            path += '/';
        }
        handler = self.pages[path];
        if (typeof handler === 'string' &&
           (handler.slice(-5) === '.html' || handler.slice(-4) === '.htm')) {
            filename = handler;
            handler = function (callback) {
                fs.readFile(filename, {encoding:'utf-8'}, function (err, data) {
                    callback(err || data);
                });
            };
        }
        if (typeof handler !== 'function') {
            content = handler;
            handler = function (callback) {
                callback(content);
            };
        }
        handler.call(self, function (content) {
            if (!content) {
                content = self.pages['404'] || 'Page not found.';
                code = 404;
            }
            response.writeHead(code, {'Content-Type': 'text/html'});
            response.end(content);
        });
    },
    
    setSlots: function () {
        var self = this;
        self.ioServer.of('/slots').on('connection', function (socket) {
            _.each(self.slots, function (handler, name) {
                socket.on(name, function (request, callback) {
                    self.applyMiddleware(request, function (request) {
                        handler(request, callback);
                    });
                });
            });
        });
    },
    
    applyMiddleware: function (request, callback) {
        var self = this,
            mids = [];
        _.each(self.middleware, function (mid) {
            mids.push(function (next) {
                mid(request, function (request) {
                    next(null, request);
                });
            });
        });
        async.series(mids, function (err) {
            if (err) { throw err; }
            callback(request);
        });
    },
    
    className: 'Server',
    
    pages: null,
    staticDir: null,
    port: 8000,
    
    middleware: null,
    slots: null,
    
    connectServer: null,
    httpServer: null,
    ioServer: null,
    
});