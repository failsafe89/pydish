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


var util_create_shader = function (gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return [shader, null];
    }

    var err_msg = gl.getShaderInfoLog(shader);
    console.error(err_msg);
    gl.deleteShader(shader);

    return [null, err_msg];
};

var api_display_compile_vertex_shader = function (state, args, kwargs) {
    var code = args[0];
    const [shader, err] = util_create_shader(state.gl, state.gl.VERTEX_SHADER, code);
    if (shader == null) {
        return {type: "display", response: {
            func: "compile_vertex_shader",
            status: 1,
            status_msg: err,
            data: {}
        }};
    }

    var index = state.vertex_shaders.length;
    state.vertex_shaders.push(shader);

    return {type: "display", response: {
        func: "compile_vertex_shader",
        status: 0,
        status_msg: "success",
        data: {
            id: index
        }
    }};
}

var api_display_compile_fragment_shader = function (state, args, kwargs) {
    var code = args[0];
    const [shader, err] = util_create_shader(state.gl, state.gl.FRAGMENT_SHADER, code);
    if (shader == null) {
        return {type: "display", response: {
            func: "compile_fragment_shader",
            status: 1,
            status_msg: err,
            data: {}
        }};
    }

    var index = state.fragment_shaders.length;
    state.fragment_shaders.push(shader);

    return {type: "display", response: {
        func: "compile_fragment_shader",
        status: 0,
        status_msg: "success",
        data: {
            id: index
        }
    }};
}

var api_display_create_program = function (state, args, kwargs) {
    var vertex_shader_id = args[0];
    var fragment_shader_id = args[1];

    var uniforms = kwargs['uniforms'];
    var attributes = kwargs['attributes'];

    var vertex_shader = state.vertex_shaders[vertex_shader_id];
    var fragment_shader = state.fragment_shaders[fragment_shader_id];

    var program = state.gl.createProgram();
    state.gl.attachShader(program, vertex_shader);
    state.gl.attachShader(program, fragment_shader);
    state.gl.linkProgram(program);

    var success = state.gl.getProgramParameter(program, state.gl.LINK_STATUS);
    if (success) {
        // Create a vertex array for the program
        var vao = state.gl.createVertexArray();

        var index = state.programs.length;
        state.programs.push({
            glid: program,
            uniforms: uniforms,
            attributes: attributes,
            vao: vao
        });

        for (var u_name in state.programs[index].uniforms) {
            var u = state.programs[index].uniforms[u_name];

            u.loc = state.gl.getUniformLocation(program, u_name);
        }

        // Bind the vertex array object as we're about to update it
        state.gl.bindVertexArray(vao);
        for (var a_name in state.programs[index].attributes) {
            var a = state.programs[index].attributes[a_name];

            // Get the location for the attribute
            a.loc = state.gl.getAttribLocation(program, a_name);
            // Enable the attribute
            state.gl.enableVertexAttribArray(a.loc);
            // Create a buffer for the attribute
            // a.buffer = state.gl.createBuffer();
            // Bind the buffer, to link against the attribute
            // state.gl.bindBuffer(state.gl.ARRAY_BUFFER, a.buffer);
            // Update the vertex array object for the current attribute, linking it to the new buffer
            // state.gl.vertexAttribPointer(a.loc, a.size, state.gl.FLOAT, false, 0, 0);
        }
        
        return {type: "display", response: {
            func: "create_program",
            status: 0,
            status_msg: "success",
            data: {
                id: index
            }
        }};
    }

    var err_msg = state.gl.getProgramInfoLog(program);
    console.error(err_msg);
    state.gl.deleteProgram(program);

    return {type: "display", response: {
        func: "create_program",
        status: 1,
        status_msg: err_msg,
        data: {}
    }};
}

var api_display_create_buffer = function (state, args, kwargs) {
    var buff = state.gl.createBuffer();
    var buff_id = state.new_buff_id;
    state.new_buff_id += 1;

    state.array_buffers[buff_id] = {
        buff: buff,
        size: 0
    };

    return {type: 'display', response: {
        func: "create_buffer",
        status: 0,
        status_msg: "success",
        data: {
            id: buff_id
        }
    }};
};

var api_display_buffer_update_data = function (state, args, kwargs) {
    var buff_index = args[0];
    var buff = state.array_buffers[buff_index];
    var data = args[1];

    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, buff.buff);
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array(data), state.gl.STATIC_DRAW);

    buff.size = data.length;

    return {type: "display", response: {
        func: "buffer_update_data",
        status: 0,
        status_msg: "success",
        data: {}
    }};
};

var api_display_program_link_attributes = function (state, args, kwargs) {
    var program_index = args[0];
    var program = state.programs[program_index];
    var attribute_buffers = args[1];

    // Set the program as we're about to update it
    state.gl.useProgram(program.glid);
    // Bind the vertex array object as we're about to update it
    state.gl.bindVertexArray(program.vao);
    for (var a_name in attribute_buffers) {
        var a = program.attributes[a_name];
        var buff = state.array_buffers[attribute_buffers[a_name]];
        
        a.buffer = buff;

        // Bind the buffer, to link against the attribute
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, a.buffer.buff);
        // Update the vertex array object for the current attribute, linking it to the new buffer
        state.gl.vertexAttribPointer(a.loc, a.size, state.gl.FLOAT, false, 0, 0);
    }

    return {type: "display", response: {
        func: "program_link_attributes",
        status: 0,
        status_msg: "success",
        data: {}
    }};
};

var api_display_program_update_uniforms = function (state, args, kwargs) {
    var program_index = args[0];
    var program = state.programs[program_index];
    var uniform_values = args[1];

    // Set the program as we're about to update it
    state.gl.useProgram(program.glid);

    // Set the uniforms, calling the correct function based on the size
    for (var u_name in uniform_values) {
        var u = program.uniforms[u_name];
        var val = uniform_values[u_name];

        switch (u.size) {
            case 1:
                state.gl.uniform1fv(u.loc, val);
                break;
            case 2:
                state.gl.uniform2fv(u.loc, val);
                break;
            case 3:
                state.gl.uniform3fv(u.loc, val);
                break;
            case 4:
                state.gl.uniform4fv(u.loc, val);
                break;
            default:
                return {type: "display", response: {
                    fund: "execute_program",
                    status: 1,
                    status_msg: "bad uniform size, must be in (1,2,3,4)",
                    data: {}
                }};
        }
    }

    return {type: "display", response: {
        func: "program_update_uniforms",
        status: 0,
        status_msg: "success",
        data: {}
    }};
};

var api_display_execute_program = function (state, args, kwargs) {
    var program_index = args[0];
    var program = state.programs[program_index];
    var count = [];
    var count_multiplier = 1;

    var draw_type_str = args[1];
    var draw_type = state.gl.TRIANGLES;
    switch (draw_type_str) {
        case "points":
            draw_type = state.gl.POINTS;
            count_multiplier = 1;
            break;
        case "lines":
            draw_type = state.gl.LINES;
            count_multiplier = 2;
            break;
        case "triangles":
            draw_type = state.gl.TRIANGLES;
            count_multiplier = 3;
            break;
        default:
            return {type: "display", response: {
                fund: "execute_program",
                status: 1,
                status_msg: "unknown draw type, must be in (POINTS, LINES, TRIANGLES)",
                data: {}
            }};
    }

    for (a_name in program.attributes) {
        var a = program.attributes[a_name];
        count.push(a.buffer.size / a.size);
    }
    count = Math.trunc(Math.min(...count));

    // Set opengl to use the specified program and vertex array
    state.gl.useProgram(program.glid);
    state.gl.bindVertexArray(program.vao);

    // // Set the uniforms, calling the correct function based on the size
    // for (var u_name in uniform_values) {
    //     var u = program.uniforms[u_name];
    //     var val = uniform_values[u_name];

    //     switch (u.size) {
    //         case 1:
    //             state.gl.uniform1fv(u.loc, val);
    //             break;
    //         case 2:
    //             state.gl.uniform2fv(u.loc, val);
    //             break;
    //         case 3:
    //             state.gl.uniform3fv(u.loc, val);
    //             break;
    //         case 4:
    //             state.gl.uniform4fv(u.loc, val);
    //             break;
    //         default:
    //             return {type: "display", response: {
    //                 fund: "execute_program",
    //                 status: 1,
    //                 status_msg: "bad uniform size, must be in (1,2,3,4)",
    //                 data: {}
    //             }};
    //     }
    // }

    // Set the attribute buffer data
    // for (var a_name in attribute_arrays) {
    //     var a = program.attributes[a_name];
    //     var val = attribute_arrays[a_name];

    //     state.gl.bindBuffer(state.gl.ARRAY_BUFFER, a.buffer);
    //     state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array(val), state.gl.STATIC_DRAW);
    // }

    // Draw
    state.gl.drawArrays(draw_type, 0, count);

    return {type: "display", response: {
        func: "execute_program",
        status: 0,
        status_msg: "success",
        data: {}
    }};
}

var api_display_set_gl_viewport = function (state, args, kwargs) {
    const [origin_x, origin_y, width, height] = args;
    
    state.gl.viewport(origin_x, origin_y, width, height);

    return {type: "display", response: {
        func: "set_gl_viewport",
        status: 0,
        status_msg: "success",
        data: {}
    }};
}

var api_display_set_gl_clear_color = function (state, args, kwargs) {
    const [r, g, b, a] = args;

    state.gl.clearColor(r, g, b, a);

    return {type: "display", response: {
        func: "set_gl_clear_color",
        status: 0,
        status_msg: "success",
        data: {}
    }};
}

var api_display_clear = function (state, args, kwargs) {

    state.gl.clear(state.gl.COLOR_BUFFER_BIT | state.gl.DEPTH_BUFFER_BIT);

    return {type: "display", response: {
        func: "clear",
        status: 0,
        status_msg: "success",
        data: {}
    }};
}

var api_display_init_display = function (state, args, kwargs) {
    console.log("Initializing Display...");

    state.vertex_shaders = [];
    state.fragment_shaders = [];
    state.programs = [];
    state.array_buffers = {};
    state.new_buff_id = 0;

    state.output_canvas = window.document.getElementById("canvas_output_ctx");
    state.render_canvas = window.document.createElement("canvas");
    state.render_canvas.width = 600;
    state.render_canvas.height = 400;
    // window.document.body.appendChild(state.render_canvas);

    state.gl = state.render_canvas.getContext("webgl2", {preserveDrawingBuffer: true});
    if (!state.gl) {
        return {type: "display", response: {
            func: "init_display",
            status: 1,
            status_msg: "Failed to get WebGL2 Context for canvas "+state.canvas,
            data: {}
        }};
    }

    return {type: "display", response: {
        func: "init_display",
        status: 0,
        status_msg: "success",
        data: {}
    }};
}

var api_display_get_resolution = function (state, args, kwargs) {
    console.log("Return Request for Display Resolution...");

    if (!state.render_canvas) {
        return {type: "display", response: {
            func: "get_resolution",
            status: 1,
            status_msg: "Failed to get resolution, the canvas could not be found",
            data: {}
        }};
    }

    return {type: "display", response: {
        func: "get_resolution",
        status: 0,
        status_msg: "success",
        data: {w: state.render_canvas.width, h: state.render_canvas.height}
    }};
}

var api_display_update_canvas = function (state, args, kwargs) {
    console.log("Updating output canvas from render canvas...");

    var destCtx = state.output_canvas.getContext('2d');
    destCtx.clearRect(0,0,state.output_canvas.width,state.output_canvas.height);
    destCtx.drawImage(state.render_canvas, 0, 0);

    return {type: "display", response: {
        func: "update_canvas",
        status: 0,
        status_msg: "success",
        data: {}
    }};
}

var api_display_handle = function (state, msg) {
    // console.log("Display API msg RECV: " + msg.func);
    var r = null;
    switch (msg.func) {
        case "init_display":
            r = api_display_init_display(state, msg.args, msg.kwargs);
            return r;
        case "get_resolution":
            r = api_display_get_resolution(state, msg.args, msg.kwargs);
            return r;
        case "compile_vertex_shader":
            r = api_display_compile_vertex_shader(state, msg.args, msg.kwargs);
            return r;
        case "compile_fragment_shader":
            r = api_display_compile_fragment_shader(state, msg.args, msg.kwargs);
            return r;
        case "create_program":
            r = api_display_create_program(state, msg.args, msg.kwargs);
            return r;
        case "create_buffer":
            r = api_display_create_buffer(state, msg.args, msg.kwargs);
            return r;
        case "buffer_update_data":
            r = api_display_buffer_update_data(state, msg.args, msg.kwargs);
            return r;
        case "program_link_attributes":
            r = api_display_program_link_attributes(state, msg.args, msg.kwargs);
            return r;
        case "program_update_uniforms":
            r = api_display_program_update_uniforms(state, msg.args, msg.kwargs);
            return r;
        case "execute_program":
            r = api_display_execute_program(state, msg.args, msg.kwargs);
            return r;
        case "set_gl_viewport":
            r = api_display_set_gl_viewport(state, msg.args, msg.kwargs);
            return r;
        case "set_gl_clear_color":
            r = api_display_set_gl_clear_color(state, msg.args, msg.kwargs);
            return r;
        case "clear":
            r = api_display_clear(state, msg.args, msg.kwargs);
            return r;
        case "update_canvas":
            r = api_display_update_canvas(state, msg.args, msg.kwargs);
            return r;
        default:
            return {type: "display", response: {
                func: msg.func,
                status: 99,
                status_msg: "Unknown Display API Function ("+msg.func+") called",
                data: {}
            }}
    }
}