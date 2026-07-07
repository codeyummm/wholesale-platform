import json

with open('/Users/deepakmalik/.gemini/antigravity/brain/1f0348c7-a051-4f7a-b596-d4413e8fdef0/.system_generated/logs/transcript.jsonl') as f:
    lines = f.readlines()

for line in lines:
    try:
        data = json.loads(line)
        if data.get('type') == 'PLANNER_RESPONSE':
            tool_calls = data.get('tool_calls', [])
            for call in tool_calls:
                if call['name'] in ['replace_file_content', 'multi_replace_file_content']:
                    instr = call['args'].get('Instruction', '')
                    if 'Tailwind' in instr or 'tailwind' in instr:
                        args_str = str(call['args'])
                        target_len = len(call['args'].get('TargetContent', ''))
                        if call['name'] == 'multi_replace_file_content':
                            for chunk in call['args']['ReplacementChunks']:
                                print(f"Chunk Target Len: {len(chunk['TargetContent'])}")
                        else:
                            print(f"Target Len: {target_len}")
    except Exception as e:
        pass
