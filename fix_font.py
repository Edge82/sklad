import sys

input_file = '/home/alex/sklad/sklad/src/assets/font-base64.ts'
with open(input_file, 'r') as f:
    content = f.read().strip()

# Если файл начинается с 'ysrK...', значит это чистое base64 (часть Kysr...)
# Мы должны обернуть его в экспорт.
if content.startswith('ysrK') or content.startswith('Kysr'):
    new_content = f"export const fontBase64 = '{content}';"
    with open(input_file, 'w') as f:
        f.write(new_content)
    print("Font file successfully wrapped in export.")
else:
    print("Font file seems to already have an export or unknown format.")
