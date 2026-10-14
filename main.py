import os
import json
import threading
from flask import Flask, render_template_string, request, redirect, url_for, jsonify
import nextcord
from nextcord.ext import commands

# ==========================================
# 1. الإعدادات الأساسية والتوكنات الخاصة بالبوت
# ==========================================
TOKEN = "MTUzNjk5NTQxNDMzNzc5MDAzMg.G1fpYe.-BsyN7hSgOM1sOnDwMEdZbQXoDlnsxFdML8Fpo"  # ضع توكن بوتك الحقيقي هنا
PORT = 80  

mutation_multipliers = {
    "neon": 1.5, "cyber": 1.8, "gold": 2.5, "diamond": 3.0, "shadow": 4.0
}
mutations_list = ["Neon", "Cyber", "Gold", "Diamond", "Shadow"]

def get_embed_color(mutation_name):
    colors = {
        "none": 0x2B2D31, "neon": 0x00FFCC, "cyber": 0x9900FF,
        "gold": 0xFFD700, "diamond": 0x00DFFF, "shadow": 0x111111
    }
    return colors.get(mutation_name.lower(), 0x2B2D31)

custom_system_emojis = {
    "traits": {"strength": "💪", "speed": "⚡", "luck": "🍀", "defense": "🛡️"}
}
# ==========================================
# 2. نظام إدارة وقراءة قواعد البيانات (JSON)
# ==========================================
def load_database():
    if not os.path.exists("database.json"):
        initial_data = {
            "Goku": {
                "basePrice": "150.00", "strawberry": "500", "dragon": "200", "garama": "100",
                "demand": "■■■■■■■■□□ `8/10` 📈", "income": "$1,200", "type": "MYSTICAL",
                "obtained": "Gacha Capsule", "status": "Stable", "lastUpdated": "2026-08-25"
            }
        }
        with open("database.json", "w", encoding="utf-8") as f:
            json.dump(initial_data, f, indent=4, ensure_ascii=False)
    with open("database.json", "r", encoding="utf-8") as f:
        return json.load(f)

def save_database(data):
    with open("database.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

items_database = load_database()

def get_item_data(name):
    return items_database.get(name, {
        "basePrice": "0.00", "strawberry": "—", "dragon": "—", "garama": "—",
        "demand": "▢▢▢▢▢▢▢▢▢▢ `0/10` ▬", "income": "—", "type": "UNKNOWN",
        "obtained": "Unknown Craft", "status": "Stable", "lastUpdated": "لم يتم التجديد بعد"
    })

def get_item_image_url(guild: nextcord.Guild, item_name, mutation="none"):
    clean_name = item_name.replace(" ", "").lower()
    for emoji in guild.emojis:
        if emoji.name.lower() == clean_name:
            return emoji.url
    return None
# ==========================================
# 3. محرك لوحة التحكم للويب (Flask Web Dashboard)
# ==========================================
app = Flask(__name__)

DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>لوحة تحكم أسعار البوت | SAB Market</title>
    <link href="https://jsdelivr.net" rel="stylesheet">
    <style>
        body { background-color: #1a1a1a; color: #ffffff; font-family: 'Segoe UI', sans-serif; }
        .card { background-color: #2d2d2d; border: 1px solid #3d3d3d; color: #fff; margin-bottom: 20px; }
        .form-control, .form-select { background-color: #3d3d3d; border: 1px solid #4d4d4d; color: #fff; }
        .form-control:focus, .form-select:focus { background-color: #4d4d4d; color: #fff; border-color: #0d6efd; box-shadow: none; }
        .table { color: #fff; }
    </style>
</head>
<body class="container py-5">
    <h1 class="text-center mb-4 text-primary">📊 لوحة التحكم في قيم وأسعار الشخصيات</h1>
    <div class="row">
        <div class="col-md-5">
            <div class="card p-4 shadow">
                <h3 class="mb-3 text-info">➕ إضافة / تعديل شخصية</h3>
                <form action="/update" method="POST">
                    <div class="mb-3"><label class="form-label">اسم الشخصية الأساسي:</label><input type="text" name="name" class="form-control" required></div>
                    <div class="mb-3"><label class="form-label">السعر الأساسي ($):</label><input type="text" name="basePrice" class="form-control" required></div>
                    <div class="row">
                        <div class="col-6 mb-3"><label class="form-label">Strawberry:</label><input type="text" name="strawberry" class="form-control"></div>
                        <div class="col-6 mb-3"><label class="form-label">Dragon:</label><input type="text" name="dragon" class="form-control"></div>
                    </div>
                    <div class="mb-3"><label class="form-label">الطلب:</label><input type="text" name="demand" class="form-control"></div>
                    <div class="mb-3"><label class="form-label">سعر السوق (Income):</label><input type="text" name="income" class="form-control"></div>
                    <div class="row">
                        <div class="col-6 mb-3"><label class="form-label">الندرة (Type):</label><input type="text" name="type" class="form-control"></div>
                        <div class="col-6 mb-3"><label class="form-label">طريقة الحصول:</label><input type="text" name="obtained" class="form-control"></div>
                    </div>
                    <button type="submit" class="btn btn-success w-100 py-2">💾 حفظ البيانات فوراً</button>
                </form>
            </div>
        </div>
        <div class="col-md-7">
            <div class="card p-4 shadow">
                <h3 class="mb-3 text-warning">📂 الشخصيات المسجلة حالياً</h3>
                <table class="table table-dark table-striped align-middle">
                    <thead><tr><th>الاسم</th><th>السعر</th><th>قيمة السوق</th><th>تحكم</th></tr></thead>
                    <tbody>
                        {% for item, details in data.items() %}
                        <tr><td class="fw-bold text-info">{{ item }}</td><td>${{ details.basePrice }}</td><td>{{ details.income }}</td><td><a href="/delete/{{ item }}" class="btn btn-danger btn-sm">حذف</a></td></tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(DASHBOARD_TEMPLATE, data=load_database())

@app.route('/update', methods=['POST'])
def update():
    global items_database
    name = request.form.get('name').strip()
    if name:
        items_database[name] = {
            "basePrice": request.form.get('basePrice', '0.00'), "strawberry": request.form.get('strawberry', '—'),
            "dragon": request.form.get('dragon', '—'), "garama": request.form.get('garama', '—'),
            "demand": request.form.get('demand', '▢▢▢▢▢▢▢▢▢▢ 0/10'), "income": request.form.get('income', '—'),
            "type": request.form.get('type', 'MYSTICAL').upper(), "obtained": request.form.get('obtained', 'Basic Craft'),
            "status": "Stable", "lastUpdated": "تحديث عبر لوحة التحكم"
        }
        save_database(items_database)
    return redirect(url_for('index'))

@app.route('/delete/<name>')
def delete(name):
    global items_database
    if name in items_database:
        del items_database[name]
        save_database(items_database)
    return redirect(url_for('index'))

def run_flask():
    app.run(port=PORT, debug=False, use_reloader=False)
# ==========================================
# 4. محرك وتشغيل بوت الديسكورد (Nextcord Bot Commands)
# ==========================================
bot = commands.Bot(command_prefix="!", intents=nextcord.Intents.default())

@bot.event
async def on_ready():
    print(f"[متصل] تم تشغيل البوت بنجاح بالبايثون: {bot.user}")
    threading.Thread(target=run_flask, daemon=True).start()
    print(f"[الويب] لوحة التحكم نشطة على: http://localhost:{PORT}")

def get_trait_custom_emoji(guild: nextcord.Guild, trait_name):
    if not trait_name or trait_name.lower() == "none": return ""
    return custom_system_emojis["traits"].get(trait_name.lower(), "🏷️")

def get_mutation_emoji(guild: nextcord.Guild, mutation_name):
    return "🧬 " if mutation_name.lower() != "none" else ""

def generate_mutation_menu(guild: nextcord.Guild, clean_name, user_id):
    if user_id not in user_selections:
        user_selections[user_id] = {"mutation": "none"}
    data = get_item_data(clean_name)
    sm = user_selections[user_id]["mutation"]
    cp = str(data["basePrice"])
    combo_key = f"{sm.lower()}_none"
    
    if "combosData" in data and combo_key in data["combosData"]:
        cp = str(data["combosData"][combo_key]["basePrice"])
    elif sm and sm.lower() != "none":
        cp = str(float(data["basePrice"]) * mutation_multipliers.get(sm.lower(), 1.0))
        
    price_display = cp if not cp.replace('.','',1).isdigit() else f"${float(cp):.2f}"
    embed = nextcord.Embed(title=f"💵 🧸 {clean_name} • {get_mutation_emoji(guild, sm) + sm if sm.lower() != 'none' else 'No mutation'}", description=f"**{price_display}**\n\nTap mutations below.", color=get_embed_color(sm))
    
    options = [nextcord.SelectOption(label=m, value=m) for m in mutations_list]
    options.insert(0, nextcord.SelectOption(label="🚫 No mutation", value="none"))
    select_menu = nextcord.ui.Select(custom_id=f"ms_{clean_name.replace(' ', '_')}", placeholder=f"Selected: {sm}", options=options[:25])
    
    view = nextcord.ui.View()
    view.add_item(select_menu)
    view.add_item(nextcord.ui.Button(label="🔍 Search", style=nextcord.ButtonStyle.primary, custom_id=f"bsrc_{clean_name.replace(' ', '_')}"))
    view.add_item(nextcord.ui.Button(label="🧹 Clear", style=nextcord.ButtonStyle.secondary, custom_id=f"bclr_{clean_name.replace(' ', '_')}"))
    view.add_item(nextcord.ui.Button(label="✅ Done", style=nextcord.ButtonStyle.success, custom_id=f"bdon_{clean_name.replace(' ', '_')}"))
    return embed, view

@bot.slash_command(name="value", description="يعرض قيم وأسعار العناصر والشخصيات")
async def value(interaction: nextcord.Interaction, name: str, mutation: str = "none"):
    await interaction.response.defer()
    if name not in items_database:
        all_items = list(items_database.keys())
        closest_name = None
        highest_score = 0
        for item in all_items:
            score = sum(1 for idx in range(min(len(name), len(item))) if name.lower()[idx] == item.lower()[idx])
            if score > highest_score: highest_score = score; closest_name = item
        if closest_name and highest_score >= 2: name = closest_name
        else:
            await interaction.followup.send(embed=nextcord.Embed(title="❌ شخصية غير مسجلة", color=0xFF0000))
            return

    data = get_item_data(name)
    p, str_val, dra_val, gar_val, dem_val, final_income, final_time = str(data["basePrice"]), data["strawberry"], data["dragon"], data.get("garama", "—"), data["demand"], data["income"], data.get("lastUpdated", "لم يتم التجديد بعد")
    
    price_display = p if not p.replace('.','',1).isdigit() else f"${float(p):.2f}"
    embed = nextcord.Embed(title=name, description=data.get("type", "SECRET"), color=get_embed_color(mutation))
    embed.add_field(name="💵 **سعر الشراء**", value=f"— `{price_display}`", inline=False)
    embed.add_field(name="Strawberry Elephant", value=f"— `{str_val}`", inline=False)
    embed.add_field(name="Dragon Cannelloni", value=f"— `{dra_val}`", inline=False)
    embed.add_field(name="📈 **سعر الشخصية**", value=f"— `{final_income}`", inline=False)
    embed.add_field(name="📊 **الطلب على الشخصية**", value=dem_val, inline=False)
    embed.set_footer(text="SAB Market Value")
    
    view = nextcord.ui.View()
    view.add_item(nextcord.ui.Button(label="📄 Full Details", style=nextcord.ButtonStyle.secondary, custom_id=f"fd_{name.replace(' ', '_')}"))
    view.add_item(nextcord.ui.Button(label="🪐 Mutations & value", style=nextcord.ButtonStyle.primary, custom_id=f"tm_{name.replace(' ', '_')}"))
    await interaction.followup.send(embed=embed, view=view)

user_selections = {}

# ==========================================
# 5. تشغيل السكربت
# ==========================================
if __name__ == "__main__":
    bot.run(TOKEN)
