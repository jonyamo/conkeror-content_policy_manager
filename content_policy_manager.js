/* content_policy_manager.js -- A manager for Conkeror's content policy component

 Copyright (c) 2014, Jon Yamokoski <code@jonyamo.us>

 Permission to use, copy, modify, and/or distribute this software for any
 purpose with or without fee is hereby granted, provided that the above
 copyright notice and this permission notice appear in all copies.

 THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

 */

require("content-policy.js");
Components.utils.import("resource://gre/modules/osfile.jsm");

var content_policy_manager = (function () {

    var ACCEPT  = content_policy_accept,
        REJECT  = content_policy_reject,
        DEFAULT = ACCEPT;

    var current_request = {};

    var custom_policies,
        content_policies;

    var init_filtered_content_types = function () {
        content_policy_bytype_table.other             = filter_request;
        content_policy_bytype_table.script            = filter_request;
        content_policy_bytype_table.image             = filter_request;
        content_policy_bytype_table.stylesheet        = filter_request;
        content_policy_bytype_table.object            = filter_request;
        // content_policy_bytype_table.document          = filter_request;
        // content_policy_bytype_table.subdocument       = filter_request;
        // content_policy_bytype_table.xbl               = filter_request;
        // content_policy_bytype_table.ping              = filter_request;
        content_policy_bytype_table.xmlhttprequest    = filter_request;
        content_policy_bytype_table.object_subrequest = filter_request;
        // content_policy_bytype_table.dtd               = filter_request;
        content_policy_bytype_table.font              = filter_request;
        content_policy_bytype_table.media             = filter_request;
    };

    var init_hooks = function () {
        add_hook("content_policy_hook", content_policy_bytype);
        add_hook("content_buffer_finished_loading_hook", reset);
    };

    var init_commands = function () {
        interactive("content-policy-reload",
                    "Reload custom content policies.",
                    function (I) {
                        content_policy_manager.reload();
                        I.window.minibuffer.message("Custom policies reloaded.");
                    });
    };

    var init_user_variables = function () {
        define_variable("content_policy_allow_same_domain", true,
            "If true, requests to the same domain as the origin will always be accepted.");
    };

    var load_content_policies = function () {
        content_policies = {
            "1"  : { "name" : "other",             "policy" : { "*" : { "*" : ACCEPT }}},
            "2"  : { "name" : "script",            "policy" : { "*" : { "*" : ACCEPT }}},
            "3"  : { "name" : "image",             "policy" : { "*" : { "*" : ACCEPT }}},
            "4"  : { "name" : "stylesheet",        "policy" : { "*" : { "*" : ACCEPT }}},
            "5"  : { "name" : "object",            "policy" : { "*" : { "*" : ACCEPT }}},
            "6"  : { "name" : "document",          "policy" : { "*" : { "*" : ACCEPT }}},
            "7"  : { "name" : "subdocument",       "policy" : { "*" : { "*" : ACCEPT }}},
            "9"  : { "name" : "xbl",               "policy" : { "*" : { "*" : ACCEPT }}},
            "10" : { "name" : "ping",              "policy" : { "*" : { "*" : ACCEPT }}},
            "11" : { "name" : "xmlhttprequest",    "policy" : { "*" : { "*" : ACCEPT }}},
            "12" : { "name" : "object_subrequest", "policy" : { "*" : { "*" : ACCEPT }}},
            "13" : { "name" : "dtd",               "policy" : { "*" : { "*" : ACCEPT }}},
            "14" : { "name" : "font",              "policy" : { "*" : { "*" : ACCEPT }}},
            "15" : { "name" : "media",             "policy" : { "*" : { "*" : ACCEPT }}}
        };

        var custom_policies_json = OS.Path.join(
            OS.Constants.Path.profileDir, "custom_policies.json");

        if (!OS.File.exists(custom_policies_json))
            return;

        OS.File.read(custom_policies_json, { encoding: "utf-8" }).then(
            function on_success (data) {
                custom_policies = JSON.parse(data, function (k, v) {
                    if (v == "ACCEPT")
                        return ACCEPT;
                    else if (v == "REJECT")
                        return REJECT;
                    else
                        return v;
                });
                for (var key in custom_policies) {
                    content_policies[key].policy = custom_policies[key];
                }
            },
            function on_failure (reason) {
                throw reason;
            }
        );
    };

    var filter_request = function (content_type, content_location, request_origin, context) {
        var orig = request_origin.host.toString();
        var dest = content_location.host.toString();

        // log("context: " + context);

        current_request.policies = current_request.policies || {};

        if (key_exists(current_request.policies, [content_type, orig, dest])) {
            return current_request.policies[content_type][orig][dest];
        }

        var policy = DEFAULT;
        if (orig == dest && content_policy_allow_same_domain) {
            policy = ACCEPT;
        } else if (key_exists(content_policies, [content_type, "policy"])) {
            var policies = content_policies[content_type].policy;
            if (key_exists(policies, [orig, dest])) {
                policy = policies[orig][dest];
            } else if (key_exists(policies, [orig, "*"])) {
                policy = policies[orig]["*"];
            } else if (key_exists(policies, ["*", dest])) {
                policy = policies["*"][dest];
            } else if (key_exists(policies, ["*", "*"])) {
                policy = policies["*"]["*"];
            }
        }

        set_key(current_request.policies, [content_type, orig, dest], policy);
        return policy;
    };

    var dump_request = function () {
        for (var type in current_request.policies) {
            for (var orig in current_request.policies[type]) {
                for (var dest in current_request.policies[type][orig]) {
                    log("type: " + content_policies[type].name
                        + ", origin: " + orig
                        + ", destination: " + dest
                        + ", policy: " + current_request.policies[type][orig][dest]);
                }
            }
        }
    };

    var reset = function () {
        dump_request();
        current_request = {};
    };

    var key_exists = function (base, keys) {
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i];
            if (   base !== null
                   && typeof base === "object"
                   && key in base
               ) {
                base = base[key];
            } else {
                return false;
            }
        }
        return true;
    };

    var set_key = function (base, keys, value) {
        var last_key = arguments.length === 3 ? keys.pop() : false;
        for (var i = 0, l = keys.length; i < l; i++) {
            base = base[keys[i]] = base[keys[i]] || {};
        }
        if (last_key)
            base = base[last_key] = value;
        return base;
    };

    var log = function (msg) {
        dumpln("[content-policy] " + msg);
    };

    return {
        init: function () {
            init_hooks();
            init_commands();
            init_user_variables();
            init_filtered_content_types();
            load_content_policies();
        },

        reload: function () {
            load_content_policies();
        }
    };

})();

content_policy_manager.init();
