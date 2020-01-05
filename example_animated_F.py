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

import atexit
import math
import time
import random

from pydish import connector

connector.run()

def on_close():
    connector.shutdown()
atexit.register(on_close)

d = connector.Display()
d.init_display()

width, height = d.get_resolution()
print("Width: %d Height: %d" % (width, height))

vertex_shader_id = d.compile_vertex_shader("""
#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision"
precision mediump float;
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;

uniform vec2 u_resolution;
uniform vec2 u_translation;
uniform vec2 u_rotation;
uniform vec2 u_scale;

//flat out vec2 final_vert;
//out vec2 screenSpace;
//out vec2 identitySpace;

// all shaders have a main function
void main() {
  vec2 scaled_position = a_position * u_scale;

  vec2 rotated_position = vec2(
      scaled_position.x * u_rotation.y + scaled_position.y * u_rotation.x,
      scaled_position.y * u_rotation.y - scaled_position.x * u_rotation.x
  );

  vec2 translated_position = rotated_position + u_translation;
  vec2 zeroToOne = translated_position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  //screenSpace = translated_position;
  //identitySpace = vec2(float(((gl_VertexID+1) % 3) == 0), float(((gl_VertexID+2) % 3) == 0));
 
  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

  //final_vert = translated_position;
}
""".lstrip())

fragment_shader_id = d.compile_fragment_shader("""
#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision"
precision mediump float;

//in vec2 final_vert;
//in vec2 screenSpace;
//in vec2 identitySpace;

uniform vec4 u_color;
uniform vec2 u_resolution;
 
// we need to declare an output for the fragment shader
out vec4 outColor;

float plot(vec2 st, float pct) {
  return smoothstep( pct - 0.02, pct, st.y ) - smoothstep( pct, pct + 0.02, st.y );
}
 
void main() {
  // Get the coordinate of the pixel in clipSpace
  vec2 clipSpace = (2.0 * (gl_FragCoord.xy / u_resolution)) - 1.0;

  float pct = plot(clipSpace, clipSpace.x);
  //float pct = 4.0;

  // Just set the output to a constant reddish-purple
  outColor = (1.0-pct)*u_color + pct*vec4(0.0, 1.0, 0.0, 1.0);

  // Using the final vert position with a known identity position of (0.0, 1.0),
  // calculate the position of the first vert position with a known identity position of (0.0, 0.0)
  //vec2 delta_dist = final_vert - screenSpace;
  //vec2 delta_ident = vec2(0.0, 1.0) - identifySpace;
}
""".lstrip())

program_id = d.create_program(vertex_shader_id, fragment_shader_id,
uniforms={
    "u_resolution": {"size": 2},
    "u_color": {"size": 4},
    "u_translation": {"size": 2},
    "u_rotation": {"size": 2},
    "u_scale": {"size": 2},
},
attributes={
    "a_position": {"size": 2},
})

# Create a buffer and link it to the a_position attribute
vertex_buffer = d.create_buffer()
d.program_link_attributes(program_id, {
    "a_position": vertex_buffer
})

# Initialise the display context properties
d.set_gl_viewport(0, 0, width, height)
d.set_gl_clear_color(0, 0, 0, 0)

# Initial Clear of display context
d.clear()

def draw_f(display, res_width, res_height, program_id, vertex_buffer, x, y, r, s, color):
    display.program_update_uniforms(program_id, {
        "u_resolution": [res_width, res_height],
        "u_color": [*color, 1],
        "u_translation": [x, y],
        "u_rotation": r,
        "u_scale": s,
    })
    display.buffer_update_data(vertex_buffer, [
        # left column
        0.0,0.0,
        30.0,0.0,
        0.0,150.0,
        0.0,150.0,
        30.0,0.0,
        30.0,150.0,

        # top rung
        30.0,0.0,
        100.0,0.0,
        30.0,30.0,
        30.0,30.0,
        100.0,0.0,
        100.0,30.0,

        # middle rung
        30.0,60.0,
        67.0,60.0,
        30.0,90.0,
        30.0,90.0,
        67.0,60.0,
        67.0,90.0
    ])
    display.execute_program(program_id, "triangles")

def rotation_from_degrees(deg):
    PI = 3.14159
    rad = deg * (PI / 180.0)
    return math.sin(rad), math.cos(rad)

color = [random.randint(8,255)/255.0, random.randint(8,255)/255.0, random.randint(8,255)/255.0]
deg = 0
while True:
    time.sleep(0.01)
    d.clear()
    draw_f(d, width, height, program_id, vertex_buffer, 200, 200, rotation_from_degrees(deg), [abs(rotation_from_degrees(deg)[0])]*2, color)
    d.update_canvas()
    deg += 1
    deg = (deg - 360) if deg > 360 else deg