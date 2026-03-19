import base64
import os

def convert_font_to_base64(font_path, output_path):
    if not os.path.exists(font_path):
        print(f"Error: {font_path} not found")
        return False
    
    with open(font_path, "rb") as font_file:
        encoded_string = base64.b64encode(font_file.read()).decode('utf-8')
    
    # Мы используем имя экспорта fontBase64, который ожидается в Inventory.vue
    with open(output_path, "w") as ts_file:
        ts_file.write(f"export const fontBase64 = '{encoded_string}';\n")
    
    return True

# Попробуем найти стандартные пути к шрифтам в Linux
possible_fonts = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf"
]

font_found = False
output_file = "/home/alex/sklad/sklad/src/assets/font-base64.ts"

for font in possible_fonts:
    if convert_font_to_base64(font, output_file):
        print(f"Successfully converted {font}")
        font_found = True
        break

if not font_found:
    print("No suitable system font found to convert.")
