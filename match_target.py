import json

with open('/Users/deepakmalik/.gemini/antigravity/brain/1f0348c7-a051-4f7a-b596-d4413e8fdef0/.system_generated/logs/transcript.jsonl') as f:
    lines = f.readlines()

with open('frontend/src/components/Inventory/InventoryList.jsx.backup', 'r') as f:
    backup_code = f.read()

for line in lines:
    try:
        data = json.loads(line)
        if data.get('type') == 'PLANNER_RESPONSE':
            for call in data.get('tool_calls', []):
                if call['name'] in ['replace_file_content', 'multi_replace_file_content']:
                    args_str = str(call['args'])
                    if 'Tailwind' in args_str or 'tailwind' in args_str:
                        # Find the TargetContent manually from the raw string
                        import re
                        m = re.search(r"'TargetContent':\s*'([^']*)", args_str)
                        if m:
                            target = m.group(1).replace('\\n', '\n')
                            snippet = target[:200]
                            print("Instruction:", call['args'].get('Instruction', ''))
                            print("Match in backup?:", snippet in backup_code)
                            if not (snippet in backup_code):
                                print("Snippet preview:", repr(snippet))
                            print("---")
    except Exception as e:
        pass
