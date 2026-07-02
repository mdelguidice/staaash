- `2026-06-12 11:31:32` | GUARD | MEDIUM | SOFT BLOCKED: recursive/force rm → cd /tmp && rm -rf prim_check && mkdir prim_check && unzip -o "/Users/mike/Desktop/Files/Primitives.zip" -d /tmp/prim_check >/dev/null 2>&1
echo "=== contents ==="; find /tmp/prim_check -type f
echo; echo "=== any number/float/dimension types across extracted files ==="
grep -rlE '"\$type": ?"(number|float|dimension)"' /tmp/prim_check 2>/dev/null
echo; echo "=== sample number token (with context) ==="
grep -rnE -B2 -A8 '"\$type": ?"(number|float|dimension)"' /tmp/prim_check 2>/dev/null | head -40
- `2026-06-23 15:58:28` | FAILURE | ERROR | BUILD | mcp__c5bc2a10-3d27-42ea-8878-c3140a7d9eb0__use_figma | TypeError: figma.getVariableByIdAsync: no such property 'getVariableByIdAsync' on the figma global object
