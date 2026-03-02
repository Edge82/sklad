import base64
import os

# Путь к локальным ресурсам, где может быть шрифт.
# Часто в проектах Vue/Vite шрифты лежат в public/fonts или src/assets/fonts.
# Но так как мы их не нашли, попробуем поискать в node_modules что-то .ttf
search_dirs = [
    '/home/alex/sklad/sklad/node_modules'
]

found_fonts = []
for sd in search_dirs:
    for root, dirs, files in os.walk(sd):
        for file in files:
            if file.endswith(".ttf") and "cyrillic" in file.lower():
                found_fonts.append(os.path.join(root, file))

if found_fonts:
    font_path = found_fonts[0]
    with open(font_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
        with open('/home/alex/sklad/sklad/src/assets/font-base64.ts', "w") as out:
            out.write(f"export const robotoFont = '{encoded}';")
        print(f"Font {font_path} converted successfully")
else:
    # План Б: Если TTF нет, используем системный шрифт (если он есть в Linux контейнере)
    system_font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    if os.path.exists(system_font):
        with open(system_font, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
            with open('/home/alex/sklad/sklad/src/assets/font-base64.ts', "w") as out:
                out.write(f"export const robotoFont = '{encoded}';")
            print("System font converted successfully")
    else:
        print("No suitable font found")
