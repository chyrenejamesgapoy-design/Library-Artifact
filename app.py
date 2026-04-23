from flask import Flask, render_template, request, redirect, session, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import random, os
from collections import deque

# =========================
# APP SETUP
# =========================
app = Flask(__name__)
app.secret_key = "primal_vault_final_v5_premium"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///artifacts.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
app.login_manager = login_manager 

# =========================
# DATABASE MODELS
# =========================
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(10), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    gold = db.Column(db.Integer, default=1000)
    vault_level = db.Column(db.Integer, default=1) 
    trophies = db.Column(db.Integer, default=0) 
    artifacts = db.relationship('Artifact', backref='owner', lazy=True)

class Artifact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    rarity = db.Column(db.String(20)) 
    power = db.Column(db.Integer)
    element = db.Column(db.String(50))
    level = db.Column(db.Integer, default=1) 
    wins = db.Column(db.Integer, default=0)
    profile_img = db.Column(db.String(255))
    power_cells = db.Column(db.Integer, default=5)
    is_favorite = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(50))
    bio = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

logs = deque(maxlen=6)

# =========================
# HELPER FUNCTIONS
# =========================

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def generate_bio(role):
    bios = {
        'Marksman': ["Optical sensors locked.", "Precision-weighted targeting."],
        'Mage': ["Arcane conduit ready.", "Quantum flux detected."],
        'Fighter': ["Frontline durability optimized.", "Hydraulic limbs online."],
        'Assassin': ["Shadow-protocol initialized.", "Cloaking strike unit."],
        'Knight': ["Strategic defensive bulwark.", "Indestructible bastion."]
    }
    return random.choice(bios.get(role, ["System data stable."]))

# =========================
# AUTH ROUTES
# =========================

@app.route("/")
def index():
    if current_user.is_authenticated: return redirect(url_for("dashboard"))
    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        u = request.form.get("username", "").strip()
        p = request.form.get("password", "").strip()
        if not (4 <= len(u) <= 10):
            flash("Username must be 4-10 chars.")
            return redirect(url_for("register"))
        if User.query.filter_by(username=u).first():
            flash("Username taken!")
            return redirect(url_for("register"))
        new_user = User(username=u, password=generate_password_hash(p))
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for("login"))
    return render_template("register.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        u, p = request.form.get("username"), request.form.get("password")
        user = User.query.filter_by(username=u).first()
        if user and check_password_hash(user.password, p):
            login_user(user)
            return redirect(url_for("dashboard"))
        flash("Access Denied.")
    return render_template("login.html")

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("index"))

# =========================
# DASHBOARD
# =========================

@app.route("/dashboard")
@login_required
def dashboard():
    v_lvl = current_user.vault_level if current_user.vault_level else 1
    next_reward = 500 * (3**(v_lvl - 1))
    v_cost = 15000 * (3**(v_lvl - 1))
    slot_limit = 6 + (v_lvl - 1)
    items_list = sorted(current_user.artifacts, key=lambda x: (x.is_favorite, x.power), reverse=True)
    total_wins = sum(it.wins for it in items_list)
    return render_template("dashboard.html", 
                           items=items_list, 
                           logs=list(logs), 
                           gold=current_user.gold, 
                           vault_lvl=v_lvl, 
                           vault_cost=v_cost, 
                           next_reward=next_reward, 
                           limit=slot_limit, 
                           full=len(items_list), 
                           total_wins=total_wins,
                           trophies=current_user.trophies)

# =========================
# ACTIONS
# =========================

@app.route("/collect_gold", methods=["POST"])
@login_required
def collect_gold():
    v_lvl = current_user.vault_level or 1
    reward = 500 * (3**(v_lvl - 1))
    current_user.gold += reward
    db.session.commit()
    return jsonify({"new_gold": current_user.gold, "reward": reward})

@app.route("/upgrade_vault", methods=["POST"])
@login_required
def upgrade_vault():
    v_lvl = current_user.vault_level or 1
    cost = 15000 * (3**(v_lvl - 1))
    if current_user.gold >= cost:
        current_user.gold -= cost
        current_user.vault_level += 1
        db.session.commit()
        logs.appendleft(f"UPGRADE: Vault is now Level {current_user.vault_level}!")
    return redirect(url_for("dashboard"))

@app.route("/forge", methods=["POST"])
@login_required
def forge():
    v_lvl = current_user.vault_level or 1
    slot_limit = 6 + (v_lvl - 1)

    if len(current_user.artifacts) >= slot_limit:
        logs.appendleft("SYSTEM: Slots full.")
        return redirect(url_for("dashboard"))
    
    rarity_list = ["Common", "Rare", "Epic", "Legendary"]
    selected_rarity = random.choices(rarity_list, weights=[70, 20, 8, 2])[0]
    
    role = random.choice(['Marksman', 'Mage', 'Fighter', 'Assassin', 'Knight'])
    name = request.form.get("name") or f"Relic-{random.randint(100,999)}"
    
    new_art = Artifact(
        name=name, 
        rarity=selected_rarity,
        power=random.randint(50, 100),
        element=random.choice(["🔥", "💧", "⚡", "🌿", "🌪️"]),
        role=role, 
        bio=generate_bio(role),
        profile_img=f"https://api.dicebear.com/8.x/pixel-art/svg?seed={name}",
        owner=current_user
    )
    db.session.add(new_art)
    db.session.commit()
    return redirect(url_for("dashboard"))

@app.route("/upgrade/<int:item_id>", methods=["POST"])
@login_required
def upgrade(item_id):
    it = Artifact.query.get_or_404(item_id)
    if it.level >= 50:
        flash(f"{it.name} is already at Max Level!")
        return redirect(url_for("dashboard"))

    cost = 250 * (2**(it.level - 1))
    if current_user.gold >= cost:
        current_user.gold -= cost
        it.power += random.randint(200, 500)
        it.level += 1 
        db.session.commit()
    else:
        flash("Insufficient gold for upgrade!")
    return redirect(url_for("dashboard"))

@app.route("/favorite/<int:item_id>", methods=["POST"])
@login_required
def toggle_favorite(item_id):
    item = Artifact.query.get_or_404(item_id)
    if item.owner == current_user:
        item.is_favorite = not item.is_favorite
        db.session.commit()
    return redirect(url_for("dashboard"))

@app.route("/delete/<int:item_id>", methods=["POST"])
@login_required
def delete_artifact(item_id):
    item = Artifact.query.get_or_404(item_id)
    if item.owner == current_user:
        db.session.delete(item)
        db.session.commit()
    return redirect(url_for("dashboard"))

# =========================
# ARENA / BATTLE
# =========================

@app.route('/battle')
@login_required
def battle():
    return render_template('battle.html', trophies=current_user.trophies)

@app.route('/update_trophies', methods=['POST'])
@login_required
def update_trophies():
    current_user.trophies += 3
    db.session.commit()
    return jsonify({"new_trophies": current_user.trophies})

if __name__ == "__main__":
    with app.app_context():
        db.create_all() 
    app.run(debug=True, use_reloader=False)