import re

with open('/Users/deepakmalik/.gemini/antigravity/brain/1f0348c7-a051-4f7a-b596-d4413e8fdef0/.system_generated/logs/transcript.jsonl') as f:
    text = f.read()

# Find TargetContent using regex: "TargetContent":"..."
# We will match "TargetContent":" up to the first <truncated
matches = re.finditer(r'"TargetContent":"([^"]*<truncated[^>]*>)', text)
for i, match in enumerate(matches):
    print(f"--- MATCH {i+1} ---")
    print(match.group(1).encode('unicode_escape').decode('utf-8')[:500] + "... (truncated for display)")
    # let's just print the raw string length
    print(len(match.group(1)))

