#!/usr/bin/env python3

import trio

try:
    import importlib.resources as pkg_resources
except ImportError:
    import importlib_resources as pkg_resources # Try backported to PY<37 `importlib_resources`.

from . import static

DEFAULT_PATH_MAP = {
    "/": pkg_resources.read_text(static, "device.html"),
    "/connector": pkg_resources.read_text(static, "connector.js"),
    "/display_firmware": pkg_resources.read_text(static, "display_firmware.js"),
    # "/keyboard_firmware": pkg_resources.read_text(static, "keyboard_firmware.js"),
    # "/mouse_firmware": pkg_resources.read_text(static, "mouse_firmware.js")
}

async def http_main(path_map=DEFAULT_PATH_MAP):
    async def http_handler(stream):
        req = (await stream.receive_some()).decode('utf-8')
        method, path, proto_version = req.split('\n')[0].split()
        print(f"GET Request for path {path}")
        if path_map is None or path not in path_map:
            await stream.send_all(f"HTTP/1.1 404 Not Found\n\nError Not Found\n".encode('utf-8'))
            return
        response_body = path_map[path]
        await stream.send_all(f"HTTP/1.1 200 OK\n\n{response_body}\n".encode('utf-8'))
    async with trio.open_nursery() as n:
            n.start_soon(trio.serve_tcp, http_handler, 8080)