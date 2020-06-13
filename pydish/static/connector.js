// Copyright 2020 Mathew Young

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var setup_connector = function () {
    var ws = new WebSocket("ws://localhost:8088");
    var state = {};

    var message_handler = function (event) {
        // console.log(event.data)

        api_json = JSON.parse(event.data);
        if (api_json.api == "display") {
            r = api_display_handle(state, api_json.msg);
        }
        else
        {
            r = {type: api_json.api, response: {
                func: api_json.msg.func,
                status: 99,
                status_msg: "Unexpected api (" + api_json.api + ")",
                data: {}
            }};
        }

        // console.log("Sending "+r.type);
        ws.send(JSON.stringify(r));
    };
    ws.onmessage = message_handler;
};

setup_connector();