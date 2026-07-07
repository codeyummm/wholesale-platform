import json

with open('/Users/deepakmalik/.gemini/antigravity/brain/1f0348c7-a051-4f7a-b596-d4413e8fdef0/.system_generated/logs/transcript.jsonl') as f:
    lines = f.readlines()

with open('frontend/src/components/Inventory/InventoryList.jsx', 'r') as f:
    code = f.read()

for line in reversed(lines):
    try:
        data = json.loads(line)
        if data.get('type') == 'PLANNER_RESPONSE':
            tool_calls = data.get('tool_calls', [])
            for call in tool_calls:
                if call['name'] in ['replace_file_content', 'multi_replace_file_content']:
                    # Parse stringified arguments
                    args = {k: json.loads(v) for k, v in call['args'].items()}
                    
                    if 'InventoryList.jsx' in args.get('TargetFile', ''):
                        if call['name'] == 'replace_file_content':
                            target = args['TargetContent']
                            replacement = args['ReplacementContent']
                            if replacement in code:
                                print("Reverting:", args.get('Instruction'))
                                code = code.replace(replacement, target)
                            else:
                                print("Not found for replacement:", args.get('Instruction'))
                        else:
                            for chunk in args['ReplacementChunks']:
                                target = chunk['TargetContent']
                                replacement = chunk['ReplacementContent']
                                if replacement in code:
                                    print("Reverting chunk from:", args.get('Instruction'))
                                    code = code.replace(replacement, target)
                                else:
                                    print("Chunk not found for:", args.get('Instruction'))
    except Exception as e:
        print("Error parsing:", e)

with open('frontend/src/components/Inventory/InventoryList.jsx', 'w') as f:
    f.write(code)
print("Done")
