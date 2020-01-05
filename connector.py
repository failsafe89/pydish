#!/usr/bin/env python3

import json
import time
import trio

from functools import partial
from multiprocessing import Process, Queue
from trio_websocket import serve_websocket, ConnectionClosed

CONNECTOR_PROCESS = None
CONNECTOR_DISPLAY_API_RECV = Queue()
CONNECTOR_API_SEND = Queue()
CONNECTOR_INPUT_API_RECV = Queue()

from . import http_server
# import http_server

async def main(display_recv, input_recv, api_send):
    async def connector_server(request):
        ws = await request.accept()
        while True:
            try:
                msg = json.dumps(await trio.to_thread.run_sync(api_send.get))
                await ws.send_message(msg)
                msg = json.loads(await ws.get_message())
                if msg['type'] == 'display':
                    display_recv.put_nowait(msg)
                elif msg['type'] == 'input':
                    input_recv.put_nowait(msg)
                else:
                    raise ValueError("[API message] unknown api type")
            except ConnectionClosed:
                print("[CONNECTOR] CONNECTION CLOSED")
                return
    async with trio.open_nursery() as n:
        n.start_soon(http_server.http_main)
        n.start_soon(partial(serve_websocket, connector_server, '0.0.0.0', 8088, ssl_context=None))

def start_server(display_recv, input_recv, api_send):
    trio.run(main, display_recv, input_recv, api_send)

def run():
    global CONNECTOR_PROCESS
    global CONNECTOR_API_SEND
    global CONNECTOR_INPUT_API_RECV, CONNECTOR_INPUT_API_SEND

    if CONNECTOR_PROCESS is None:
        CONNECTOR_PROCESS = Process(target=start_server, args=(
            CONNECTOR_DISPLAY_API_RECV, CONNECTOR_INPUT_API_RECV,
            CONNECTOR_API_SEND
        ))
        CONNECTOR_PROCESS.start()

def shutdown():
    global CONNECTOR_PROCESS

    if CONNECTOR_PROCESS is not None:
        CONNECTOR_PROCESS.kill()
        CONNECTOR_PROCESS.join()
        CONNECTOR_PROCESS = None

class Display(object):
    def __init__(self):
        if CONNECTOR_PROCESS is None:
            run()
        self.recvq = CONNECTOR_DISPLAY_API_RECV
        self.sendq = CONNECTOR_API_SEND
    
    def init_display(self):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "init_display",
                "args": [],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None
    
    def set_gl_viewport(self, origin_x, origin_y, width, height):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "set_gl_viewport",
                "args": [
                    origin_x, origin_y,
                    width, height
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None
    
    def set_gl_clear_color(self, r, g, b, a):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "set_gl_clear_color",
                "args": [
                    r, g, b, a
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None
    
    def clear(self):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "clear",
                "args": [],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None
    
    def update_canvas(self):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "update_canvas",
                "args": [],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None
    
    def get_resolution(self):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "get_resolution",
                "args": [],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return r['response']['data']['w'], r['response']['data']['h']

    def compile_vertex_shader(self, code):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "compile_vertex_shader",
                "args": [
                    code
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return r['response']['data']['id']

    def compile_fragment_shader(self, code):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "compile_fragment_shader",
                "args": [
                    code
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return r['response']['data']['id']

    def create_program(self, vertex_shader_id, fragment_shader_id, uniforms=None, attributes=None):
        uniforms = {} if uniforms is None else uniforms
        attributes = {} if attributes is None else attributes

        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "create_program",
                "args": [
                    vertex_shader_id,
                    fragment_shader_id
                ],
                "kwargs": {
                    'uniforms': uniforms,
                    'attributes': attributes
                }
            }
        })
        r = self.recvq.get()
        print(r)
        return r['response']['data']['id']

    def create_buffer(self):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "create_buffer",
                "args": [],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return r['response']['data']['id']

    def buffer_update_data(self, buffer, data):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "buffer_update_data",
                "args": [
                    buffer,
                    data
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None

    def program_link_attributes(self, program, attribute_arrays):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "program_link_attributes",
                "args": [
                    program,
                    attribute_arrays
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None

    def program_update_uniforms(self, program, uniform_values):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "program_update_uniforms",
                "args": [
                    program,
                    uniform_values
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None

    def execute_program(self, program_id, draw_type):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "execute_program",
                "args": [
                    program_id,
                    draw_type
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None