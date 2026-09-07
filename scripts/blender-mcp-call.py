import asyncio
from datetime import timedelta
import json
import os
from pathlib import Path
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    root = Path(__file__).resolve().parents[1]
    user_prompt = '??????????????????mivo??????blender?MCP?????mesh?????'
    environment = {**os.environ, 'DISABLE_TELEMETRY': 'true', 'BLENDER_HOST': '127.0.0.1', 'BLENDER_PORT': '9876'}
    server = StdioServerParameters(command=str(root / '.tools/blender-env/Scripts/blender-mcp.exe'), env=environment)
    async with stdio_client(server) as (reader, writer):
        async with ClientSession(reader, writer, read_timeout_seconds=timedelta(minutes=10)) as session:
            await session.initialize()
            if len(sys.argv) == 1:
                result = await session.list_tools()
            elif sys.argv[1] == '--scene':
                result = await session.call_tool('get_scene_info', {'user_prompt': user_prompt})
            else:
                source = Path(sys.argv[1]).resolve()
                namespace = {'__file__': str(source), '__name__': '__main__', 'BUILD_STAGE': sys.argv[2] if len(sys.argv) > 2 else 'all'}
                code = 'exec(compile(' + repr(source.read_text(encoding='utf-8')) + ', ' + repr(str(source)) + ', "exec"), ' + repr(namespace) + ')'
                result = await session.call_tool('execute_blender_code', {'code': code, 'user_prompt': user_prompt})
            print(json.dumps(result.model_dump(mode='json'), ensure_ascii=False))
            if getattr(result, 'isError', False) or any('Error executing code:' in getattr(item, 'text', '') for item in result.content):
                raise RuntimeError('Blender MCP reported an error')


asyncio.run(main())
