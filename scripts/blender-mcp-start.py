import importlib.util
import os
from pathlib import Path
import sys

import bpy

root = Path(__file__).resolve().parents[1]
os.environ['DISABLE_TELEMETRY'] = 'true'
spec = importlib.util.spec_from_file_location('ironclad_blender_mcp', root / '.tools/blender-mcp/addon.py')
addon = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = addon
spec.loader.exec_module(addon)
addon.register()
bpy.context.scene.blendermcp_auto_start_server = False
if hasattr(bpy.context.scene, 'blendermcp_telemetry_consent'):
    bpy.context.scene.blendermcp_telemetry_consent = False
server = getattr(bpy.types, 'blendermcp_server', None)
if server is None:
    server = addon.BlenderMCPServer(host='127.0.0.1', port=9876)
    bpy.types.blendermcp_server = server
if not server.running:
    server.start()
bpy.context.scene.blendermcp_server_running = server.running
print('IRONCLAD_BLENDER_MCP_READY', flush=True)
