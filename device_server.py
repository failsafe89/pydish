#!/usr/bin/env python3

from multiprocessing import Process

RUNNING_PROCESS = None

# def server():
#     import cherrypy

#     class DeviceDriver(object):
#         @cherrypy.expose
#         def index(self):
#             with open('device.html') as f:
#                 return f.read()
        
#         @cherrypy.expose
#         def connector(self):
#             with open('connector.js') as f:
#                 return f.read()
        
#         @cherrypy.expose
#         def display_firmware(self):
#             with open('display_firmware.js') as f:
#                 return f.read()
        
#         @cherrypy.expose
#         def keyboard_firmware(self):
#             with open('keyboard_firmware.js') as f:
#                 return f.read()
        
#         @cherrypy.expose
#         def mouse_firmware(self):
#             with open('mouse_firmware.js') as f:
#                 return f.read()

#     cherrypy.config.update({'server.socket_host': '0.0.0.0'})
#     cherrypy.quickstart(DeviceDriver())

DEFAULT_PATH_MAP = {
    "/": "device.html",
    "/connector": "connector.js",
    "/display_firmware": "display_firmware.js",
    "/keyboard_firmware": "keyboard_firmware.js",
    "/mouse_firmware": "mouse_firmware.js"
}

import trio
def server(path_map):
    async def http_main(path_map):
        async def http_handler(stream):
            req = (await stream.receive_some()).decode('utf-8')
            method, path, proto_version = req.split('\n')[0].split()
            print(f"GET Request for path {path}")
            if path_map is None or path not in path_map:
                await stream.send_all(f"HTTP/1.1 404 Not Found\n\nError Not Found\n".encode('utf-8'))
                return
            with open(path_map[path], 'r') as f:
                response_body = f.read()
            await stream.send_all(f"HTTP/1.1 200 OK\n\n{response_body}\n".encode('utf-8'))
        async with trio.open_nursery() as n:
            n.start_soon(trio.serve_tcp, http_handler, 8080)
    
    trio.run(http_main, path_map)

def run(path_map=DEFAULT_PATH_MAP):
    global RUNNING_PROCESS

    if RUNNING_PROCESS is None:
        RUNNING_PROCESS = Process(target=server, args=(path_map,))
        RUNNING_PROCESS.start()

def shutdown():
    global RUNNING_PROCESS
    
    if RUNNING_PROCESS is not None:
        RUNNING_PROCESS.kill()
        RUNNING_PROCESS.join()
        RUNNING_PROCESS = None