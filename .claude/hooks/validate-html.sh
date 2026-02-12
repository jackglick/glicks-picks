#!/bin/bash
# Validate HTML structure after file edits
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check HTML files
if [[ "$FILE_PATH" != *.html ]]; then
  exit 0
fi

# Check for basic structural issues
if [ -f "$FILE_PATH" ]; then
  # Verify DOCTYPE exists
  if ! head -1 "$FILE_PATH" | grep -qi "doctype"; then
    echo "Warning: HTML file missing DOCTYPE declaration" >&2
    exit 0
  fi

  # Check for unclosed tags (basic check)
  OPEN_DIVS=$(grep -c '<div' "$FILE_PATH" 2>/dev/null || echo 0)
  CLOSE_DIVS=$(grep -c '</div>' "$FILE_PATH" 2>/dev/null || echo 0)
  if [ "$OPEN_DIVS" != "$CLOSE_DIVS" ]; then
    echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"Warning: Possible unclosed <div> tags. Open: $OPEN_DIVS, Close: $CLOSE_DIVS. Please verify the HTML structure.\"}}"
    exit 0
  fi
fi

exit 0
