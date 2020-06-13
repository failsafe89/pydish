#!/usr/bin/env python3

import atexit
from . import connector

connector.run()

def on_close():
    connector.shutdown()
atexit.register(on_close)

class Device(object):
    def __init__(self):
        r = connector.api_display_send('init_display')
        if r['status'] != 0:
            raise Exception(f"Failed on init_display: {r['status_msg']}")
