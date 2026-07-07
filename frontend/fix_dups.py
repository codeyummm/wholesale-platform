import re

with open('src/components/Inventory/InventoryList.jsx', 'r') as f:
    lines = f.readlines()

new_lines = []
seen_states = False
seen_handle = False

for line in lines:
    if 'const [showDeviceHistory, setShowDeviceHistory] = useState(false);' in line:
        if seen_states: continue
        seen_states = True
    if 'const [selectedDeviceHistory, setSelectedDeviceHistory] = useState(null);' in line:
        pass # Handle along with seen_states
    
    if 'const handleViewDeviceHistory =' in line:
        if seen_handle: 
            # Skip the next 14 lines
            continue
        seen_handle = True

    new_lines.append(line)

# Let's just do a smarter regex replacement or just manual fixing since it's a small file.
