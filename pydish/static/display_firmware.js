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
    // console.log("glCreateShader");
    var shader = gl.createShader(type);
    // console.log("glShaderSource");
    gl.shaderSource(shader, source);
    // console.log("glCompileShader");
    gl.compileShader(shader);
    // console.log("glGetShaderParameter");
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return [shader, null];
    }

    // console.log("glGetShaderInfoLog");
    var err_msg = gl.getShaderInfoLog(shader);
    console.error(err_msg);
    // console.log("glDeleteShader");
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

    var index = state.next_vertex_shader_id;
    state.vertex_shaders[index] = shader;
    state.next_vertex_shader_id += 1;

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

    var index = state.next_fragment_shader_id;
    state.fragment_shaders[index] = shader;
    state.next_fragment_shader_id += 1;

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

    var vertex_shader = state.vertex_shaders[vertex_shader_id];
    var fragment_shader = state.fragment_shaders[fragment_shader_id];

    // console.log("glCreateProgram");
    var program_id = state.gl.createProgram();
    // console.log("glAttachShader");
    state.gl.attachShader(program_id, vertex_shader);
    // console.log("glAttachShader");
    state.gl.attachShader(program_id, fragment_shader);
    // console.log("glLinkProgram");
    state.gl.linkProgram(program_id);

    // console.log("glGetProgramParameter");
    var success = state.gl.getProgramParameter(program_id, state.gl.LINK_STATUS);
    if (success) {
        console.info("GL Program compiled successfully")
        // Add program to state
        var program = {
            glid: program_id,
            uniforms: {},
            attributes: {}
        }
        var index = state.next_program_id;
        state.programs[index] = program;
        state.next_program_id += 1;

        // Perfrom program introspection to determine uniforms and attributes
        // console.log("glGetProgramParameter");
        num_uniforms = state.gl.getProgramParameter(program.glid, state.gl.ACTIVE_UNIFORMS);
        // console.log("glGetProgramParameter");
        num_attributes = state.gl.getProgramParameter(program.glid, state.gl.ACTIVE_ATTRIBUTES);
        console.info("Number of uniforms: " + num_uniforms);
        console.info("Number of attributes: " + num_attributes);

        // Determine the name, location, type and size for all uniforms
        for (var i = 0; i < num_uniforms; i++) {
            // console.log("glGetActiveUniform");
            uniform_info = state.gl.getActiveUniform(program.glid, i);
            // console.log("glGetUniformLocation");
            uniform_location = state.gl.getUniformLocation(program.glid, uniform_info.name);
            // console.debug(uniform_info);
            // console.debug(uniform_location);
            type_info = map_type(state.gl, uniform_info.type);
            program.uniforms[uniform_info.name] = {type_info: type_info, size: uniform_info.size, loc: uniform_location};
        }

        // Determine the name, location, type and size for all attributes
        for (var i = 0; i < num_attributes; i++) {
            // console.log("glGetActiveAttrib");
            attribute_info = state.gl.getActiveAttrib(program.glid, i);
            // console.log("glGetAttribLocation");
            attribute_location = state.gl.getAttribLocation(program.glid, attribute_info.name);
            // console.debug(attribute_info);
            // console.debug(attribute_location);
            type_info = map_type(state.gl, attribute_info.type);
            program.attributes[attribute_info.name] = {type_info: type_info, size: attribute_info.size, loc: attribute_location};
        }

        return {type: "display", response: {
            func: "create_program",
            status: 0,
            status_msg: "success",
            data: {
                id: index,
                uniforms: program.uniforms,
                attributes: program.attributes
            }
        }};
    }

    // console.log("glGetProgramInfoLog");
    var err_msg = state.gl.getProgramInfoLog(program);
    console.error(err_msg);
    // console.log("glDeleteProgram");
    state.gl.deleteProgram(program);

    return {type: "display", response: {
        func: "create_program",
        status: 1,
        status_msg: err_msg,
        data: {}
    }};
};

var api_display_create_vertex_array = function (state, args, kwargs) {
    // console.log("glCreateVertexArray");
    var vao = state.gl.createVertexArray();

    var index = state.next_vertex_array_object_id;
    state.vertex_array_objects[index] = {
        glid: vao
    };
    state.next_vertex_array_object_id += 1;

    return {type: "display", response: {
        func: "create_vertex_array",
        status: 0,
        status_msg: "success",
        data: {
            id: index
        }
    }};
};

var api_display_enable_vertex_attrib_array = function (state, args, kwargs) {
    var loc = args[0];

    // console.log("glEnableVertexAttribArray");
    state.gl.enableVertexAttribArray(loc);

    return {type: "display", response: {
        func: "enable_vertex_attrib_array",
        status: 0,
        status_msg: "success",
        data: {}
    }};
};

var api_display_create_program_old = function (state, args, kwargs) {
    var vertex_shader_id = args[0];
    var fragment_shader_id = args[1];

    var uniforms = kwargs['uniforms'];
    var attributes = kwargs['attributes'];

    var vertex_shader = state.vertex_shaders[vertex_shader_id];
    var fragment_shader = state.fragment_shaders[fragment_shader_id];

    // console.log("glCreateProgram");
    var program = state.gl.createProgram();
    // console.log("glAttachShader");
    state.gl.attachShader(program, vertex_shader);
    // console.log("glAttachShader");
    state.gl.attachShader(program, fragment_shader);
    // console.log("glLinkProgram");
    state.gl.linkProgram(program);

    // console.log("glGetProgramParameter");
    var success = state.gl.getProgramParameter(program, state.gl.LINK_STATUS);
    if (success) {
        // Create a vertex array for the program
        // console.log("glCreateVertexArray");
        var vao = state.gl.createVertexArray();

        var index = state.next_program_id;
        state.programs[index] = {
            glid: program,
            uniforms: uniforms,
            attributes: attributes,
            vao: vao
        };
        state.next_program_id += 1;

        for (var u_name in state.programs[index].uniforms) {
            var u = state.programs[index].uniforms[u_name];

            // console.log("glGetUniformLocation");
            u.loc = state.gl.getUniformLocation(program, u_name);
        }

        // Bind the vertex array object as we're about to update it
        // console.log("glBindVertexArray");
        state.gl.bindVertexArray(vao);
        for (var a_name in state.programs[index].attributes) {
            var a = state.programs[index].attributes[a_name];

            // Get the location for the attribute
            // console.log("glGetAttribLocation");
            a.loc = state.gl.getAttribLocation(program, a_name);
            // Enable the attribute
            // console.log("glEnableVertexAttribArray");
            state.gl.enableVertexAttribArray(a.loc);
            // Create a buffer for the attribute
            // a.buffer = state.gl.createBuffer();
            // Bind the buffer, to link against the attribute
            // state.gl.bindBuffer(state.gl.ARRAY_BUFFER, a.buffer);
            // Update the vertex array object for the current attribute, linking it to the new buffer
            // state.gl.vertexAttribPointer(a.loc, a.size, state.gl.FLOAT, false, 0, 0);
        }
        
        return {type: "display", response: {
            func: "create_program_old",
            status: 0,
            status_msg: "success",
            data: {
                id: index
            }
        }};
    }

    // console.log("glGetProgramInfoLog");
    var err_msg = state.gl.getProgramInfoLog(program);
    console.error(err_msg);
    // console.log("glDeleteProgram");
    state.gl.deleteProgram(program);

    return {type: "display", response: {
        func: "create_program_old",
        status: 1,
        status_msg: err_msg,
        data: {}
    }};
}

var api_display_create_buffer = function (state, args, kwargs) {
    // console.log("glCreateBuffer");
    var buff = state.gl.createBuffer();
    var buff_id = state.new_buff_id;
    state.new_buff_id += 1;

    state.buffers[buff_id] = {
        buff: buff,
        size: 0,
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

var api_display_buffer_data = function(state, args, kwargs) {
    var target_string = args[0];
    var data = args[1];

    // console.debug("Binding data to " + target_string);
    // console.debug(data);

    // console.log("glBufferData");
    state.gl.bufferData(map_buffer_type(state.gl, target_string), new Float32Array(data), state.gl.DYNAMIC_DRAW);

    return {type: 'display', response: {
        func: "buffer_data",
        status: 0,
        status_msg: "success",
        data: {}
    }};
}

var api_display_buffer_update_data = function (state, args, kwargs) {
    var buff_index = args[0];
    var buff = state.buffers[buff_index];
    var data = args[1];

    // console.log("glBindBuffer");
    state.gl.bindBuffer(state.gl.ARRAY_BUFFER, buff.buff);
    // console.log("glBufferData");
    state.gl.bufferData(state.gl.ARRAY_BUFFER, new Float32Array(data), state.gl.STATIC_DRAW);

    buff.size = data.length;

    return {type: "display", response: {
        func: "buffer_update_data",
        status: 0,
        status_msg: "success",
        data: {}
    }};
};

var api_display_use_program = function (state, args, kwargs) {
    var program_index = args[0];
    var program = state.programs[program_index];

    // console.log("glUseProgram");
    state.gl.useProgram(program.glid);

    return {type: "display", response: {
        func: "use_program",
        status: 0,
        status_msg: "success",
        data: {}
    }};
};

var api_display_bind_vertex_array = function (state, args, kwargs) {
    var vao_index = args[0];
    var vao = state.vertex_array_objects[vao_index];

    // console.log("glBindVertexArray");
    state.gl.bindVertexArray(vao.glid);

    return {type: "display", response: {
        func: "bind_vertex_array",
        status: 0,
        status_msg: "success",
        data: {}
    }};
};

var api_display_bind_buffer = function (state, args, kwargs) {
    var target_string = args[0];
    var buffer_id = args[1];

    var buffer = state.buffers[buffer_id];
    
    var target = map_buffer_type(state.gl, target_string);

    if (target == null) {
        return {type: "display", response: {
            func: "bind_buffer",
            status: 1,
            status_msg: "Unknown buffer type " + target_string,
            data: {}
        }};
    }

    // console.log("glBindBuffer");
    state.gl.bindBuffer(target, buffer.buff);

    return {type: "display", response:{
        func: "bind_buffer",
        status: 0,
        status_msg: "success",
        data: {}
    }};
};

var api_display_vertex_attrib_pointer = function (state, args, kwargs) {
    var attribute_location = args[0];
    var attribute_size = args[1];
    var attribute_type = args[2];
    var attribute_stride = args[3];
    var attribute_offset = args[4];

    console.debug("glVertexAttribPointer("+attribute_location+", "+attribute_size+", "+attribute_type+", "+attribute_stride+", "+attribute_offset+")")
    
    state.gl.vertexAttribPointer(
        attribute_location, attribute_size, attribute_type, false, attribute_stride, attribute_offset
    );

    return {type: "display", response: {
        func: "vertex_attrib_pointer",
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
    // console.log("glUseProgram");
    state.gl.useProgram(program.glid);
    // Bind the vertex array object as we're about to update it
    // console.log("glBindVertexArray");
    state.gl.bindVertexArray(program.vao);
    for (var a_name in attribute_buffers) {
        var a = program.attributes[a_name];
        var buff = state.buffers[attribute_buffers[a_name]];
        
        a.buffer = buff;

        // Bind the buffer, to link against the attribute
        // console.log("glBindBuffer");
        state.gl.bindBuffer(state.gl.ARRAY_BUFFER, a.buffer.buff);
        // Update the vertex array object for the current attribute, linking it to the new buffer
        // console.log("glVertexAttribPointer");
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

    // console.log(uniform_values);

    // Set the program as we're about to update it
    // console.log("glUseProgram");
    state.gl.useProgram(program.glid);

    // Set the uniforms, calling the correct function based on the size
    for (var u_name in uniform_values) {
        var u = program.uniforms[u_name];
        var val = uniform_values[u_name];

        // console.debug("Setting uniform " + u_name + " to");
        // console.debug(val);

        switch (u.type_info.type) {
            case state.gl.FLOAT:
                // console.log("glUniform1fv");
                state.gl.uniform1fv(u.loc, val);
                break;
            case state.gl.FLOAT_VEC2:
                // console.log("glUniform2fv");
                state.gl.uniform2fv(u.loc, val);
                break;
            case state.gl.FLOAT_VEC3:
                // console.log("glUniform3fv");
                state.gl.uniform3fv(u.loc, val);
                break;
            case state.gl.FLOAT_VEC4:
                // console.log("glUniform4fv");
                state.gl.uniform4fv(u.loc, val);
                break;
            case state.gl.UNSIGNED_INT:
            case state.gl.INT:
                // console.log("glUniform1iv");
                state.gl.uniform1iv(u.loc, val);
                break;
            case state.gl.UNSIGNED_INT_VEC2:
            case state.gl.INT_VEC2:
                // console.log("glUniform2iv");
                state.gl.uniform2iv(u.loc, val);
                break;
            case state.gl.UNSIGNED_INT_VEC3:
            case state.gl.INT_VEC3:
                // console.log("glUniform3iv");
                state.gl.uniform3iv(u.loc, val);
                break;
            case state.gl.UNSIGNED_INT_VEC4:
            case state.gl.INT_VEC4:
                // console.log("glUniform4iv");
                state.gl.uniform4iv(u.loc, val);
                break;
            case state.gl.FLOAT_MAT2:
                // console.log("glUniformMatrix2x2fv");
                state.gl.uniformMatrix2x2fv(u.loc, val);
                break;
            case state.gl.FLOAT_MAT2x3:
                // console.log("glUniformMatrix2x3fv");
                state.gl.uniformMatrix2x3fv(u.loc, val);
                break;
            case state.gl.FLOAT_MAT2x4:
                // console.log("glUniformMatrix2x4fv");
                state.gl.uniformMatrix2x4fv(u.loc, val);
                break;
            case state.gl.FLOAT_MAT3:
                // console.log("glUniformMatrix23x3fv");
                state.gl.uniformMatrix3x3fv(u.loc, val);
                break;
            case state.gl.FLOAT_MAT3x2:
                // console.log("glUniformMatrix3x2fv");
                state.gl.uniformMatrix3x2fv(u.loc, val);
                break;
            case state.gl.FLOAT_MAT3x4:
                // console.log("glUniformMatrix3x4fv");
                state.gl.uniformMatrix3x4fv(u.loc, val);
                break;
            case state.gl.FLOAT_MAT4:
                // console.log("glUniformMatrix4x4fv");
                state.gl.uniformMatrix4x4fv(u.loc, val);
                break;
            case state.gl.FLOAT_MAT4x2:
                // console.log("glUniformMatrix4x2fv");
                state.gl.uniformMatrix4x2fv(u.loc, val);
                break;
            case state.gl.FLOAT_MAT4x3:
                // console.log("glUniformMatrix4x3fv");
                state.gl.uniformMatrix4x3fv(u.loc, val);
                break;
            default:
                return {type: "display", response: {
                    fund: "program_update_uniforms",
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

var api_display_draw_arrays = function (state, args, kwargs) {
    var program_index = args[0];
    var program = state.programs[program_index];
    var vertex_array_index = args[1];
    var vao = state.vertex_array_objects[vertex_array_index];
    var draw_type_string = args[2];
    var draw_type = map_draw_type(state.gl, draw_type_string);
    var first = args[3];
    var count = args[4];

    // console.debug("Drawing array in mode " + draw_type_string + " [" + draw_type + "], first: " + first + " count: " + count)

    // console.log("glUseProgram");
    state.gl.useProgram(program.glid);
    // console.log("glBindVertexArray");
    state.gl.bindVertexArray(vao.glid);
    // console.log("glDrawArrays");
    state.gl.drawArrays(draw_type, first, count);

    return {type: "display", response: {
        func: "draw_arrays",
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
    // console.log("glUseProgram");
    state.gl.useProgram(program.glid);
    // console.log("glBindVertexArray");
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
    
    // console.log("glViewport");
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

    // console.log("glClearColor");
    state.gl.clearColor(r, g, b, a);

    return {type: "display", response: {
        func: "set_gl_clear_color",
        status: 0,
        status_msg: "success",
        data: {}
    }};
}

var api_display_clear = function (state, args, kwargs) {

    // console.log("glClear");
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

    state.vertex_shaders = {};
    state.next_vertex_shader_id = 0;
    state.fragment_shaders = {};
    state.next_fragment_shader_id = 0;
    state.programs = {};
    state.next_program_id = 0;
    state.vertex_array_objects = {};
    state.next_vertex_array_object_id = 0;
    state.buffers = {};
    state.new_buff_id = 0;

    state.output_canvas = window.document.getElementById("canvas_output_ctx");
    state.render_canvas = window.document.createElement("canvas");
    state.render_canvas.width = 600;
    state.render_canvas.height = 400;
    // window.document.body.appendChild(state.render_canvas);

    state.gl = state.render_canvas.getContext("webgl2", {
        preserveDrawingBuffer: true,
        stencil: true
    });
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

var map_draw_type = function (gl, gl_draw_type) {
    var draw_type = null;
    switch (gl_draw_type) {
        case "points":
            draw_type = gl.POINTS;
            break;
        case "lines":
            draw_type = gl.LINES;
            break;
        case "triangles":
            draw_type = gl.TRIANGLES;
            break;
        default:
            return null;
    }
    return draw_type;
};

var map_buffer_type = function(gl, gl_buffer_type) {
    var target = null;
    switch (gl_buffer_type) {
        case "ARRAY_BUFFER":
            target = gl.ARRAY_BUFFER;
            break;
        case "ELEMENT_ARRAY_BUFFER":
            target = gl.ELEMENT_ARRAY_BUFFER;
            break;
        case "COPY_READ_BUFFER":
            target = gl.COPY_READ_BUFFER;
            break;
        case "COPY_WRITE_BUFFER":
            target = gl.COPY_WRITE_BUFFER;
            break;
        case "TRANSFORM_FEEDBACK_BUFFER":
            target = gl.TRANSFORM_FEEDBACK_BUFFER;
            break;
        case "UNIFORM_BUFFER":
            target = gl.UNIFORM_BUFFER;
            break;
        case "PIXEL_PACK_BUFFER":
            target = gl.PIXEL_PACK_BUFFER;
            break;
        case "PIXEL_UNPACK_BUFFER":
            target = gl.PIXEL_UNPACK_BUFFER;
            break;
    }
    return target;
}

var map_type = function (gl, gl_type) {
    var name = "undefined";
    var base_type = null;
    var base_size = 0;
    var base_layout = [1,1];

    switch (gl_type) {
        case gl.FLOAT:
            name = "FLOAT";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [1,1];
            break;
        case gl.FLOAT_VEC2:
            name = "FLOAT_VEC2";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [2,1];
            break;
        case gl.FLOAT_VEC3:
            name = "FLOAT_VEC3";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [3,1];
            break;
        case gl.FLOAT_VEC4:
            name = "FLOAT_VEC4";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [4,1];
            break;
        case gl.INT:
            name = "INT";
            base_type = gl.INT;
            base_size = 4;
            base_layout = [1,1];
            break;
        case gl.INT_VEC2:
            name = "INT_VEC2";
            base_type = gl.INT;
            base_size = 4;
            base_layout = [2,1];
            break;
        case gl.INT_VEC3:
            name = "INT_VEC3";
            base_type = gl.INT;
            base_size = 4;
            base_layout = [3,1];
            break;
        case gl.INT_VEC4:
            name = "INT_VEC4";
            base_type = gl.INT;
            base_size = 4;
            base_layout = [4,1];
            break;
        case gl.BOOL:
            name = "BOOL";
            base_type = gl.BOOL;
            base_size = 0;
            base_layout = [1,1];
            break;
        case gl.BOOL_VEC2:
            name = "BOOL_VEC2";
            base_type = gl.BOOL;
            base_size = 0;
            base_layout = [2,1];
            break;
        case gl.BOOL_VEC3:
            name = "BOOL_VEC3";
            base_type = gl.BOOL;
            base_size = 0;
            base_layout = [3,1];
            break;
        case gl.BOOL_VEC4:
            name = "BOOL_VEC4";
            base_type = gl.BOOL;
            base_size = 0;
            base_layout = [4,1];
            break;
        case gl.FLOAT_MAT2:
            name = "FLOAT_MAT2";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [2,2];
            break;
        case gl.FLOAT_MAT3:
            name = "FLOAT_MAT3";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [3,3];
            break;
        case gl.FLOAT_MAT4:
            name = "FLOAT_MAT4";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [4,4];
            break;
        case gl.SAMPLER_2D:
            name = "SAMPLER_2D";
            base_type = gl.SAMPLER_2D;
            base_size = 0;
            base_layout = [1,1];
            break;
        case gl.SAMPLER_CUBE:
            name = "SAMPLER_CUBE";
            base_type = gl.SAMPLER_CUBE;
            base_size = 0;
            base_layout = [1,1];
            break;
        case gl.UNSIGNED_INT:
            name = "UNSIGNED_INT";
            base_type = gl.UNSIGNED_INT;
            base_size = 4;
            base_layout = [1,1];
            break;
        case gl.UNSIGNED_INT_VEC2:
            name = "UNSIGNED_INT_VEC2";
            base_type = gl.UNSIGNED_INT;
            base_size = 4;
            base_layout = [2,1];
            break;
        case gl.UNSIGNED_INT_VEC3:
            name = "UNSIGNED_INT_VEC3";
            base_type = gl.UNSIGNED_INT;
            base_size = 4;
            base_layout = [3,1];
            break;
        case gl.UNSIGNED_INT_VEC4:
            name = "UNSIGNED_INT_VEC4";
            base_type = gl.UNSIGNED_INT;
            base_size = 4;
            base_layout = [4,1];
            break;
        case gl.FLOAT_MAT2x3:
            name = "FLOAT_MAT2x3";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [2,3];
            break;
        case gl.FLOAT_MAT2x4:
            name = "FLOAT_MAT2x4";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [2,4];
            break;
        case gl.FLOAT_MAT3x2:
            name = "FLOAT_MAT3x2";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [3,2];
            break;
        case gl.FLOAT_MAT3x4:
            name = "FLOAT_MAT3x4";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [3,4];
            break;
        case gl.FLOAT_MAT4x2:
            name = "FLOAT_MAT4x2";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [4,2];
            break;
        case gl.FLOAT_MAT4x3:
            name = "FLOAT_MAT4x3";
            base_type = gl.FLOAT;
            base_size = 4;
            base_layout = [4,3];
            break;
        case gl.SAMPLER_3D:
            name = "SAMPLER_3D";
            base_type = gl.SAMPLER_3D;
            base_size = 0;
            base_layout = [1,1];
            break;
        case gl.SAMPLER_2D_SHADOW:
            name = "SAMPLER_2D_SHADOW";
            base_type = gl.SAMPLER_2D_SHADOW;
            base_size = 0;
            base_layout = [1,1];
            break;
        case gl.SAMPLER_2D_ARRAY:
            name = "SAMPLER_2D_ARRAY";
            base_type = gl.SAMPLER_2D_ARRAY;
            base_size = 0;
            base_layout = [1,1];
            break;
        case gl.SAMPLER_2D_ARRAY_SHADOW:
            name = "SAMPLER_2D_ARRAY_SHADOW";
            base_type = gl.SAMPLER_2D_ARRAY_SHADOW;
            base_size = 0;
            base_layout = [1,1];
            break;
        case gl.UNISGNED_INT_SAMPLER_2D:
            name = "UNISGNED_INT_SAMPLER_2D";
            base_type = gl.UNISGNED_INT_SAMPLER_2D;
            base_size = 0;
            base_layout = [1,1];
            break;
        case gl.UNISGNED_INT_SAMPLER_3D:
            name = "UNISGNED_INT_SAMPLER_3D";
            base_type = gl.UNISGNED_INT_SAMPLER_3D;
            base_size = 0;
            base_layout = [1,1];
            break;
        case gl.UNISGNED_INT_SAMPLER_CUBE:
            name = "UNISGNED_INT_SAMPLER_CUBE";
            base_type = gl.UNISGNED_INT_SAMPLER_CUBE;
            base_size = 0;
            base_layout = [1,1];
            break;
        case gl.UNISGNED_INT_SAMPLER_2D_ARRAY:
            name = "UNISGNED_INT_SAMPLER_2D_ARRAY";
            base_type = gl.UNISGNED_INT_SAMPLER_2D_ARRAY;
            base_size = 0;
            base_layout = [1,1];
            break;
    }
    console.log("Type [" + gl_type + ", base_type: " + base_type + "] " + name + " of size " + base_size * base_layout[0] * base_layout[1]);

    return {
        name: name,
        type: gl_type,
        base_type: base_type,
        base_size: base_size,
        base_layout: base_layout,
    }
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
        case "create_vertex_array":
            r = api_display_create_vertex_array(state, msg.args, msg.kwargs);
            return r;
        case "enable_vertex_attrib_array":
            r = api_display_enable_vertex_attrib_array(state, msg.args, msg.kwargs);
            return r;
        case "create_program_old":
            r = api_display_create_program_old(state, msg.args, msg.kwargs);
            return r;
        case "create_buffer":
            r = api_display_create_buffer(state, msg.args, msg.kwargs);
            return r;
        case "buffer_data":
            r = api_display_buffer_data(state, msg.args, msg.kwargs);
            return r;
        case "buffer_update_data":
            r = api_display_buffer_update_data(state, msg.args, msg.kwargs);
            return r;
        case "use_program":
            r = api_display_use_program(state, msg.args, msg.kwargs);
            return r;
        case "bind_vertex_array":
            r = api_display_bind_vertex_array(state, msg.args, msg.kwargs);
            return r;
        case "bind_buffer":
            r = api_display_bind_buffer(state, msg.args, msg.kwargs);
            return r;
        case "vertex_attrib_pointer":
            r = api_display_vertex_attrib_pointer(state, msg.args, msg.kwargs);
            return r;
        case "program_link_attributes":
            r = api_display_program_link_attributes(state, msg.args, msg.kwargs);
            return r;
        case "program_update_uniforms":
            r = api_display_program_update_uniforms(state, msg.args, msg.kwargs);
            return r;
        case "draw_arrays":
            r = api_display_draw_arrays(state, msg.args, msg.kwargs);
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