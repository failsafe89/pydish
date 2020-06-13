#!/usr/bin/env python3

# Copyright 2020 Mathew Young

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     http://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

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
    global CONNECTOR_INPUT_API_RECV#, CONNECTOR_INPUT_API_SEND

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

def api_display_send(func, *args, **kwargs):
    CONNECTOR_API_SEND.put_nowait({
        'api': 'display',
        'msg': {
            'func': func,
            'args': args,
            'kwargs': kwargs
        }
    })
    r = CONNECTOR_DISPLAY_API_RECV.get()
    return r

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

    def create_program(self, vertex_shader_id, fragment_shader_id):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "create_program",
                "args": [
                    vertex_shader_id,
                    fragment_shader_id
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return r['response']['data']

    def create_program_old(self, vertex_shader_id, fragment_shader_id, uniforms=None, attributes=None):
        uniforms = {} if uniforms is None else uniforms
        attributes = {} if attributes is None else attributes

        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "create_program_old",
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

    def bind_buffer(self, target_string, buffer_id):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "bind_buffer",
                "args": [
                    target_string,
                    buffer_id
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None

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

    def draw_arrays(self, program_id, vao_id, draw_type_string, first, count):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "draw_arrays",
                "args": [
                    program_id,
                    vao_id,
                    draw_type_string,
                    first,
                    count
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

    def enable_vertex_attrib_array(self, location):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "enable_vertex_attrib_array",
                "args": [
                    location
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None
    
    def use_program(self, program_id):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "use_program",
                "args": [
                    program_id
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None

    def create_vertex_array(self):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "create_vertex_array",
                "args": [],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return r['response']['data']['id']

    def bind_vertex_array(self, vao):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "bind_vertex_array",
                "args": [
                    vao
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None

    def vertex_attrib_pointer(self, location, size, attrib_type, stride, offset):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "vertex_attrib_pointer",
                "args": [
                    location,
                    size,
                    attrib_type,
                    stride,
                    offset
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None

    def buffer_data(self, target, data):
        self.sendq.put_nowait({
            "api": "display",
            "msg": {
                "func": "buffer_data",
                "args": [
                    target,
                    data
                ],
                "kwargs": {}
            }
        })
        r = self.recvq.get()
        print(r)
        return None

    def new_shader(self, vertex_code, fragment_code):
        s = Shader(self, vertex_code, fragment_code)
        return s

class Shader(object):
    def __init__(self, display, vertex_code, fragment_code):
        self.display = display
        self.vertex_shader = self.display.compile_vertex_shader(vertex_code)
        self.fragment_shader = self.display.compile_fragment_shader(fragment_code)
        self.program_info = self.display.create_program(self.vertex_shader, self.fragment_shader)
        self.id = self.program_info['id']
        self.uniforms = self.program_info['uniforms']
        self.attributes = self.program_info['attributes']

    def update_uniforms(self, uniforms):
        self.display.use_program(self.id)
        self.display.program_update_uniforms(self.id, uniforms)

    def new_array_object(self, layout):
        self.display.use_program(self.id)
        b = ArrayObject(self.display, self.attributes, layout)
        return b

    def execute(self, array_object, draw_type_string="triangles"):
        # self.display.use_program(self.id)
        # self.display.bind_vertex_array(array_object.id)
        self.display.draw_arrays(self.id, array_object.id, draw_type_string, array_object.first, array_object.count)

class ArrayObject(object):
    def __init__(self, display, attributes, layout):
        self.display = display
        self.attributes = attributes
        self.layout = layout
        self.array_buffer = self.display.create_buffer()
        self.id = self.display.create_vertex_array()

        self.display.bind_vertex_array(self.id)
        self.display.bind_buffer("ARRAY_BUFFER", self.array_buffer)
        offset = 0
        self.stride_size = sum([
            self.attributes[x]['type_info']['base_size'] * 
            self.attributes[x]['type_info']['base_layout'][0] *
            self.attributes[x]['type_info']['base_layout'][1]
            for x in self.layout
        ])
        self.vertex_size = sum([
            self.attributes[x]['type_info']['base_layout'][0] *
            self.attributes[x]['type_info']['base_layout'][1]
            for x in self.layout
        ])
        for a in self.layout:
            self.attributes[a]['offset'] = offset
            ncol,nrow = self.attributes[a]['type_info']['base_layout']
            for i in range(nrow):
                self.display.enable_vertex_attrib_array(self.attributes[a]['loc'])
                self.display.vertex_attrib_pointer(
                    self.attributes[a]['loc']+i,
                    ncol,
                    self.attributes[a]['type_info']['base_type'],
                    self.stride_size,
                    offset
                )
                offset += (
                    self.attributes[a]['type_info']['base_size'] *
                    self.attributes[a]['type_info']['base_layout'][0] *
                    self.attributes[a]['type_info']['base_layout'][1]
                )
        
        self.data = []
        self._first = 0
        self._count = 0
        self.first = 0
        self.count = 0

    @property
    def count(self):
        return self._draw_count

    def _calc_draw_count(self):
        # print("Calculating draw count")
        # calculate self._draw_count based on self._first and self._count
        size = len(self.data) - self._first
        print(f"Stride size: {self.stride_size}")
        print(f"Vertex size: {self.vertex_size}")
        total = int(size // self.vertex_size)
        if self._count == 0:
            self._draw_count = total
        else:
            self._draw_count = min([self._count, total])
        print(f"Calculated Draw Count: {self._draw_count}")

    @count.setter
    def count(self, value):
        self._count = value
        self._calc_draw_count()

    @property
    def first(self):
        return self._first

    @first.setter
    def first(self, value):
        self._first = value
        self._calc_draw_count()

    def modify(self, data):
        self.data = data
        self.display.bind_buffer("ARRAY_BUFFER", self.array_buffer)
        self.display.buffer_data("ARRAY_BUFFER", data)
        self._calc_draw_count()