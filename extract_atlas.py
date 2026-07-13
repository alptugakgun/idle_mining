import re
import json

with open('public/assets/game_bundle.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Find the object containing texture-0.png
# It usually looks like {"frames":{...},"meta":{"app":"...","image":"texture-0.png",...}}
match = re.search(r'\{"frames":\{.*?"image":"texture-0\.png".*?\}', text)
if match:
    json_str = match.group(0)
    # The regex might capture too much or too little if there are nested braces.
    # We can try to parse it using a brace counter.
    start_idx = match.start()
    brace_count = 0
    end_idx = -1
    for i in range(start_idx, len(text)):
        if text[i] == '{':
            brace_count += 1
        elif text[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i + 1
                break
    
    if end_idx != -1:
        extracted = text[start_idx:end_idx]
        try:
            parsed = json.loads(extracted)
            with open('public/assets/texture-0.json', 'w') as out:
                json.dump(parsed, out)
            print("Successfully extracted texture-0.json!")
        except Exception as e:
            print("Failed to parse JSON:", e)
else:
    print("Could not find frames block for texture-0.png")
