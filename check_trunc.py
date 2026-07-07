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
                    # Use regex to find TargetContent and ReplacementContent directly from the stringified args
                    args_str = str(call['args'])
                    if 'InventoryList.jsx' in args_str:
                        instr = call['args'].get('Instruction', '')
                        if 'Tailwind' in instr or 'tailwind' in instr:
                            print(f"Instruction: {instr}")
                            print(f"TargetContent contains '<truncated': {'<truncated' in call['args'].get('TargetContent', str(call['args'].get('ReplacementChunks', '')))}")
                            print(f"ReplacementContent contains '<truncated': {'<truncated' in call['args'].get('ReplacementContent', str(call['args'].get('ReplacementChunks', '')))}")
                            print("---")
    except Exception as e:
        pass
