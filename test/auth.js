var test = require('tap').test,
    _ = require('underscore'),
    auth = require('../lib/auth'),
    User = auth.User,
    props = {username: 'teu', password: '123456'},
    sha1 = require('sha1');

test('User', function (t) {
    var me = new User(props);
    t.equal(me.username, props.username);
    t.equal(me.password, sha1(props.password));
    me.setPassword('456789');
    t.equal(me.password, sha1('456789'));
    t.ok(me.checkPassword('456789'));
    t.notOk(me.checkPassword('123456'));
    t.end();
});

test('users', function (t) {
    
});