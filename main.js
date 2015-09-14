(function main() {
    console.log(process.cwd());

    var auto = require('./autom/dota2/autom_dota2');
    var readline = require('readline');

    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    auto.on('load', function() {
    });

    auto.on('change', function(state, match) {
        if (state == 'end') {
            console.log("Match " + match.match_id + " finished");
        } else if (state == 'start') {
            console.log("Match " + match.match_id + " has started");
        }
    });

    auto.on('error', function() {
        console.log("API error: make sure that your key is valid and the api is functioning");
    });

    auto.init({ key: "", period: 20000 });

    rl.on('line', function(line) {
        if (line == "terminate") {
            auto.terminate();
            process.exit();
        } else if (line == "list live") {
            (function() {
                console.log("\nLIVE MATCHES\n");

                for (var i in auto.live) {
                    console.log(auto.live[i].match_id);
                }

                console.log();
            })();
        } else if (line == "list finished") {
            (function() {
                console.log("\nFINISHED MATCHES\n");

                for (var i in auto.finished) {
                    var f = auto.finished[i];
                    var d = new Date((f.start_time + f.duration) * 1000);
                    console.log(f.match_id + " played on " + d.getFullYear() + " " + d.getMonth() + " " + d.getDate() + " winner: " + (f.radiant_win ? "radiant" : "dire"));
                }

                console.log();
            })();
        } else {
            console.log(auto[line]);
        }
    })
})();