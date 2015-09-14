'use strict';

var _this = {
    live: [],
    upcoming: [],
    leagues: [],
    finished: [],
    key: "",
    on: function(event, action) {
        _on[event] = action;
    },
    init: _init,
    terminate: function() {
        clearInterval(_updater);
        _save();
    }
};

var http = require('http');
var fs = require('fs');

var hostName = "api.steampowered.com";
var cachePath = 'autom_dota2_cache';
var finishedPath = cachePath + '/finished.dat';

var _updater;

var _incomplete = [];

function _init(options) {
    function loadFiles() {
        if (!fs.existsSync(cachePath)) {
            fs.mkdirSync(cachePath);
        }

        fs.readFile(finishedPath, function(error, data) {
            if (!error) {
                _this.finished = JSON.parse(data);
            }

            loadData();
        });
    }

    function loadData() {
        http.get({
            host: hostName,
            path: "/IDOTA2Match_570/GetLiveLeagueGames/v1/?key=" + _this.key
        }, function (response) {
            var liveData = "";

            response.on('data', function(chunk) {
                liveData += chunk;
            });

            response.on('end', function() {
                try {
                    var result = JSON.parse(liveData).result;

                    if (result.error) {
                        _on.error();
                    } else {
                        _this.live = result.games;

                        http.get({
                            host: hostName,
                            path: "/IDOTA2Match_570/GetScheduledLeagueGames/v1/?key=" + _this.key
                        }, function (response) {
                            var upcomingData = "";

                            response.on('data', function (chunk) {
                                upcomingData += chunk;
                            });

                            response.on('end', function () {
                                try {

                                    result = JSON.parse(upcomingData).result;

                                    if (result.error) {
                                        _on.error();
                                    } else {
                                        _this.upcoming = result.games;

                                        _updater = setInterval(_update, options.period);

                                        _on.load();
                                    }
                                } catch (e) {
                                    _on.error();
                                    console.log(e.stack);
                                }
                            });
                        }).on('error', function (e) {
                            _on.error();
                            console.log(e.stack);
                        });
                    }
                } catch (e) {
                    _on.error();
                    console.log(e.stack);
                }
            });
        }).on('error', function(e) {
            _on.error();
            console.log(e.stack);
        });
    }

    _this.key = options.key;

    loadFiles();
}

function _update() {
    var live = [];
    var upcoming = [];

    (function() {
        for (var i = _incomplete.length - 1; i >= 0; i--) {
            _endMatch(_incomplete[i]);
            _incomplete.splice(i, 1);
        }
    })();

    http.get({
        host: hostName,
        path: "/IDOTA2Match_570/GetLiveLeagueGames/v1/?key=" + _this.key
    }, function (response) {
        var data = "";

        response.on('data', function (chunk) {
            data += chunk;
        });

        response.on('end', function () {
            try {
                live = JSON.parse(data).result.games;

                http.get({
                    host: hostName,
                    path: "/IDOTA2Match_570/GetScheduledLeagueGames/v1/?key=" + _this.key
                }, function (response) {
                    data = "";

                    response.on('data', function (chunk) {
                        data += chunk;
                    });

                    response.on('end', function () {
                        try {
                            upcoming = JSON.parse(data).result.games;

                            for (var i = 0; i < _this.live.length; i++) {
                                var contains = false;

                                for (var j = 0; j < live.length; j++) {
                                    if (_isSame(_this.live[i], live[j])) {
                                        contains = true;
                                    }
                                }

                                if (!contains) {
                                    _endMatch(_this.live[i]);
                                }
                            }

                            for (i = 0; i < live.length; i++) {
                                contains = false;

                                for (j = 0; j < _this.live.length; j++) {
                                    if (_isSame(_this.live[j], live[i])) {
                                        contains = true;
                                    }
                                }

                                if (!contains) {
                                    _on.change('start', live[i]);
                                }
                            }

                            _this.live = live;
                            _this.upcoming = upcoming;
                        } catch (e) {
                            _on.error();
                            console.log(e.stack);
                        }
                    });
                }).on('error', function (e) {
                    _on.error();
                    console.log(e.stack);
                });
            } catch (e) {
                _on.error();
                console.log(e.stack);
            }
        });
    }).on('error', function(e) {
        _on.error();
        console.log(e.stack);
    });
}

function _save() {
    fs.writeFileSync(finishedPath, JSON.stringify(_this.finished));
}

var _on = {
    load: function() {},
    change: function(state, match) {},
    error: function() {
        _this.terminate();
    }
};

function _endMatch(match) {
    http.get({
        host: hostName,
        path: "/IDOTA2Match_570/GetMatchDetails/v1/?key=" + _this.key + "&match_id=" + match.match_id
    }, function(response) {
        var data = "";

        response.on('data', function(chunk) {
            data += chunk;
        });

        response.on('end', function() {
            try {
                var result = JSON.parse(data).result;

                if (!result.error) {
                    _this.finished.push(result);
                    _save();
                    _on.change('end', result);
                } else {
                    _incomplete.push(result);
                }
            } catch (e) {
                _on.error();
            }
        });
    }).on('error', function(e) {
        _on.error();
    });
}

function _isSame(m1, m2) {
    if (m1.match_id && m2.match_id) {
        return m1.match_id == m2.match_id;
    } else if (!m1.match_id && !m2.match_id) {
        return m1.teams.length == 2
            && m2.teams.length == 2
            && m1.teams[0].team_id == m2.teams[0].team_id
            && m1.teams[1].team_id == m2.teams[0].team_id
            && m1.league_id == m2.league_id;
    } else {
        return false;
    }
}

module.exports = _this;