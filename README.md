# Conkeror Content Policy Manager

A manager for [Conkeror's](http://conkeror.org/) content policy component.

## Introduction

Conkeror provides a content policy component which allows users to control
which content types (images, scripts, stylesheets, etc) are accepted by the
browser during each request. This extension gives the user detailed control
of the rules that determine which types are accepted/rejected.

## Installation

Simply copy `content_policy_manager.js` to your `.conkerorrc` directory.

Alternatively, add `require("/path/to/content_policy_manager.js")` to your
`.conkerorrc` file.

## Configuration

This code is currently in a pre-alpha release, and therefore, user-friendliness
is quite lacking. That being said, here is how the rules are currently
configured:

The following content types are controlled (associated IDs and names):

- ` 1: other`
- ` 2: script`
- ` 3: image`
- ` 4: stylesheet`
- ` 5: object`
- `11: xmlhttprequest`
- `12: object_subrequest`
- `14: font`
- `15: media`

By default all requests are accepted. In order to create new rules, you must
create a file called `custom_policies.json` and add it to your Conkeror
profile directory, which is located in `$HOME/.conkeror.mozdev.org/conkeror/`.
The default profile will have a name similar to `xxxxxxxx.default`.

The rules are written using `JSON` and use the following format:

    { CONTENT_TYPE_ID : { ORIGINATING_DOMAIN : { DESTINATION_DOMAIN : POLICY }}}

### Examples

- Reject all javascript requests
    
    ```
    { "2" : { "*" : { "*" : "REJECT" }}}
    ```

- Reject all javascript requests, but allow from github.com:
    
    ```
    { "2" : { "*"             : { "*" : "REJECT" },
              "github.com"    : { "*" : "ACCEPT" }}}
    ```

- Reject all image requests, but allow from stackoverflow.com to cdn.sstatic.net:
    
    ```
    { "3" : { "*"                 : { "*"               : "REJECT" },
              "stackoverflow.com" : { "cdn.sstatic.net" : "ACCEPT" }}}
    ```

- Combine above rules:
    
    ```
    {
      "2" : { "*"                 : { "*"               : "REJECT" },
              "github.com"        : { "*"               : "ACCEPT" }},
      "3" : { "*"                 : { "*"               : "REJECT" },
              "stackoverflow.com" : { "cdn.sstatic.net" : "ACCEPT" }}
    }
    ```

### Note

Custom policies can be reloaded on the fly using the command:

    M-x content-policy-reload

By default, requests to the same domain as the original will always be
accepted. This can be changed by adding the following to your `.conkerorrc`
file:

    content_policy_allow_same_domain = false;

If you run Conkeror from the command line, the status for each request will be
written to STDOUT, like so:

    [content-policy] type: script, origin: github.com, destination: assets-cdn.github.com, policy: -1
    [content-policy] type: image, origin: github.com, destination: avatars3.githubusercontent.com, policy: -1
    [content-policy] type: image, origin: github.com, destination: assets-cdn.github.com, policy: -1
    [content-policy] type: stylesheet, origin: github.com, destination: assets-cdn.github.com, policy: 1
    [content-policy] type: font, origin: github.com, destination: assets-cdn.github.com, policy: 1

## TODO

- Allow usage of wildcards in domain names, e.g., `stackoverflow.com -> *.sstatic.net`
- Add special buffer to display current request status
- Add user interface for easy modification of custom policies

