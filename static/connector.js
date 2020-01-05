

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