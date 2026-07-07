import re

with open('frontend/src/components/Inventory/InventoryList.jsx', 'r') as f:
    code = f.read()

# Extract showDeviceHistory state
state_match = re.search(r'const \[showDeviceHistory.*?useState\(false\);', code)
print("STATE:", state_match.group(0) if state_match else "None")

# Extract handleViewDeviceHistory
handle_match = re.search(r'const handleViewDeviceHistory[\s\S]*?};', code)
print("HANDLE:", handle_match.group(0) if handle_match else "None")

# Extract modal
modal_match = re.search(r'{/\* Device History Modal \*/\}[\s\S]*?}\)', code)
print("MODAL:", modal_match.group(0) if modal_match else "None")

