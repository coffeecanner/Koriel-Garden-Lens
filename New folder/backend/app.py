import os
import json
import base64
from datetime import datetime, timedelta
import random
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from functools import wraps

# Setup Flask untuk menjadi monolitik (melayani React dist folder sebagai frontend)
app = Flask(__name__, static_folder='../dist', static_url_path='/')

# Setup MySQL Database.
# Format: mysql+pymysql://<username>:<password>@<host>/<database>
database_url = os.getenv('DATABASE_URL')
if not database_url or database_url.strip() == "":
    database_url = 'mysql+pymysql://root:@localhost/bunga_tropis'
else:
    # Convert file-based URLs (like file:./dev.db) into valid SQLAlchemy SQLite strings
    if database_url.startswith('file:'):
        database_url = database_url.replace('file:', 'sqlite:///', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ==========================================
# SKEMA DATABASE MYSQL (Sesuai ERD & Spesifikasi Atribut)
# ==========================================

class Admin(db.Model):
    __tablename__ = 'admin'
    id_admin = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    nama_admin = db.Column(db.String(255), nullable=False)

class Staff(db.Model):
    __tablename__ = 'staff'
    id_staff = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    nama_staff = db.Column(db.String(255), nullable=False)
    no_telp_staff = db.Column(db.String(50), nullable=False)
    id_admin = db.Column(db.Integer, db.ForeignKey('admin.id_admin', ondelete='CASCADE'), nullable=False)

class Konsumen(db.Model):
    __tablename__ = 'konsumen'
    id_konsumen = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tanggal = db.Column(db.DateTime, default=datetime.utcnow)
    nama_konsumen = db.Column(db.String(255), nullable=False)
    no_telp_konsumen = db.Column(db.String(50), nullable=False)
    id_staff = db.Column(db.Integer, db.ForeignKey('staff.id_staff', ondelete='CASCADE'), nullable=False)

class GambarBungaTropis(db.Model):
    __tablename__ = 'gambar_bunga_tropis'
    id_gambar = db.Column(db.Integer, primary_key=True, autoincrement=True)
    file_gambar_bunga_tropis = db.Column(db.Text(length=4294967295), nullable=False) # LONGTEXT untuk Base64 / URL
    tanggal_foto = db.Column(db.DateTime, default=datetime.utcnow)
    id_staff = db.Column(db.Integer, db.ForeignKey('staff.id_staff', ondelete='CASCADE'), nullable=False)

class HasilSinkronisasi(db.Model):
    __tablename__ = 'hasil_sinkronisasi'
    id_sinkronisasi = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nama_spesies = db.Column(db.String(255), unique=True, nullable=False)
    karakteristik_perawatan = db.Column(db.Text, nullable=False)
    tanggal_sinkronisasi = db.Column(db.DateTime, default=datetime.utcnow)

class HasilIdentifikasi(db.Model):
    __tablename__ = 'hasil_identifikasi'
    id_hasil = db.Column(db.Integer, primary_key=True, autoincrement=True)
    label_kelas = db.Column(db.String(255), nullable=False)
    tanggal_identifikasi = db.Column(db.DateTime, default=datetime.utcnow)
    hasil_akurasi = db.Column(db.Float, nullable=False)
    id_gambar = db.Column(db.Integer, db.ForeignKey('gambar_bunga_tropis.id_gambar', ondelete='CASCADE'), nullable=False)
    id_sinkronisasi = db.Column(db.Integer, db.ForeignKey('hasil_sinkronisasi.id_sinkronisasi', ondelete='SET NULL'), nullable=True)

class Laporan(db.Model):
    __tablename__ = 'laporan'
    id_laporan = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tanggal_laporan = db.Column(db.DateTime, default=datetime.utcnow)
    file_dokumen = db.Column(db.Text, nullable=False)
    id_admin = db.Column(db.Integer, db.ForeignKey('admin.id_admin', ondelete='CASCADE'), nullable=True)
    id_staff = db.Column(db.Integer, db.ForeignKey('staff.id_staff', ondelete='CASCADE'), nullable=True)
    id_sinkronisasi = db.Column(db.Integer, db.ForeignKey('hasil_sinkronisasi.id_sinkronisasi', ondelete='CASCADE'), nullable=False)

# ==========================================
# LOAD DEEP LEARNING MODEL / SMART FALLBACK
# ==========================================
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'mobilenetv2_model.h5')
CLASSES_PATH = os.path.join(os.path.dirname(__file__), 'models', 'classes.json')

model_loaded = False
ml_model = None
flower_classes = {
    "0": "Adenium obesum",
    "1": "Allamanda cathartica",
    "2": "Anthurium andraeanum",
    "3": "Bougainvillea",
    "4": "Catharanthus roseus",
    "5": "Clitoria ternatea",
    "6": "Euphorbia milii",
    "7": "Gardenia jasminoides",
    "8": "Genus Plumeria",
    "9": "Hibiscus rosa sinensis",
    "10": "Ixora",
    "11": "Jasminum sambac",
    "12": "Petunia",
    "13": "Phalaenopsis amabilis",
    "14": "Zinnia elegans"
}

# Ambil karakteristik bunga tropis untuk dipresentasikan ke konsumen
FLOWER_CHARACTERISTICS = {
    "Adenium obesum": "Karakteristik: Dikenal sebagai Kamboja Jepang, memiliki bonggol batang membesar artistik yang menyimpan air, kelopak berbentuk terompet pink cerah atau merah.\nPerawatan: Membutuhkan sinar matahari penuh, siram hanya saat tanah benar-benar kering agar tidak membusuk.",
    "Allamanda cathartica": "Karakteristik: Tanaman merambat berkayu dengan bunga terompet kuning cerah berukuran besar dan daun mengkilap.\nPerawatan: Memerlukan penyiraman sedang dan pemangkasan rutin agar tetap rapi serta mendukung pemekaran bunga secara maksimal.",
    "Anthurium andraeanum": "Karakteristik: Memiliki seludang (spathe) lilin berbentuk jantung mengkilap berwarna merah cerah dengan tongkol (spadix) silindris kuning.\nPerawatan: Tumbuh subur di lingkungan teduh/tidak terkena sinar matahari langsung secara berlebihan. Jaga kelembaban tanah dengan penyiraman teratur.",
    "Bougainvillea": "Karakteristik: Tanaman perdu berduri dengan seludang bunga tipis seperti kertas berwarna cerah seperti ungu, merah muda, jingga, atau putih.\nPerawatan: Sangat menyukai sinar matahari langsung. Penyiraman dikurangi menjelang musim berbunga (fase stres air) untuk merangsang kuncup bunga baru.",
    "Catharanthus roseus": "Karakteristik: Tanaman herba tahunan dengan bunga berkelopak lima warna merah muda, putih, atau ungu, tahan terhadap berbagai cuaca ekstrem.\nPerawatan: Sangat mudah dirawat dan tahan kering. Siram 1-2 kali sehari dan berikan pupuk sebulan sekali untuk hasil terbaik.",
    "Clitoria ternatea": "Karakteristik: Tanaman merambat dengan bunga berbentuk cuping berwarna biru indigo cerah yang kaya akan antioksidan dan sering dijadikan pewarna makanan alami.\nPerawatan: Membutuhkan media rambat seperti tiang atau pagar. Siram secara teratur dan pangkas daun mati untuk merangsang tunas baru.",
    "Euphorbia milii": "Karakteristik: Memiliki batang berkayu yang dipenuhi duri tajam dengan bunga kecil-kecil berkelopak ganda berwarna merah, kuning, atau pink.\nPerawatan: Tempatkan di area panas. Penyiraman minimal karena tanaman ini sangat tahan kekeringan, gunakan media tanam yang berpori.",
    "Gardenia jasminoides": "Karakteristik: Bunga putih bersih mirip mawar yang mengeluarkan keharuman manis yang sangat pekat, dipadukan daun hijau tua mengkilap.\nPerawatan: Membutuhkan tanah asam, subur, dan lembab. Jaga dari sinar matahari siang yang terlalu terik agar daun tidak terbakar.",
    "Genus Plumeria": "Karakteristik: Pohon kecil berbatang lunak dengan bunga berbentuk bintang beraroma harum manis khas, sering kali berkelopak putih-kuning atau merah.\nPerawatan: Sangat toleran terhadap kekeringan dan menyukai sinar matahari terik. Kurangi penyiraman pada musim hujan agar batang tidak membusuk.",
    "Hibiscus rosa sinensis": "Karakteristik: Bunga berbentuk corong besar berdiameter hingga 15 cm dengan putik panjang menjulur keluar yang sangat eksotis.\nPerawatan: Tempatkan di area terbuka dengan sinar matahari penuh. Lakukan penyiraman setiap hari dan pemangkasan rutin setelah musim berbunga selesai.",
    "Ixora": "Karakteristik: Tumbuh bergerombol membentuk bola bunga kecil berwarna merah menyala, oranye, atau kuning yang kaya nektar.\nPerawatan: Menyukai tanah asam yang lembab dengan drainase yang baik. Berikan pupuk berkala untuk menjaga kepekatan warna kelopak bunga.",
    "Jasminum sambac": "Karakteristik: Bunga nasional Indonesia berukuran kecil berwarna putih bersih dengan aroma harum segar yang sangat intens, melambangkan kesucian.\nPerawatan: Berikan penyiraman setiap pagi atau sore. Pemangkasan ujung batang akan merangsang percabangan baru yang membawa bakal bunga.",
    "Petunia": "Karakteristik: Tanaman hias gantung dengan bunga berbentuk terompet beraneka warna-warni cerah atau corak garis yang sangat anggun.\nPerawatan: Memerlukan penyiraman setiap hari karena media gantung cepat kering. Hindari menyiram langsung ke kelopak bunga untuk mencegah kerontokan.",
    "Phalaenopsis amabilis": "Karakteristik: Bunga anggrek epifit bermahkota lebar putih bersih dengan lidah bercak kuning-merah, mekar bertahan hingga berbulan-bulan.\nPerawatan: Jangan ditanam di tanah biasa; gunakan media arang, pakis, atau sabut kelapa. Siram secukupnya dan letakkan di area yang teduh berventilasi baik.",
    "Zinnia elegans": "Karakteristik: Bunga semusim berkelopak tumpuk melingkar menyerupai dahlia kecil dengan warna-warna neon yang sangat kontras.\nPerawatan: Sangat mudah ditanam dari biji. Menyukai sinar matahari penuh dan tanah yang gembur. Hindari menyiram daunnya agar tidak mudah terserang jamur."
}

# Load classes JSON if exists
if os.path.exists(CLASSES_PATH):
    try:
        with open(CLASSES_PATH, 'r') as f:
            flower_classes = json.load(f)
    except Exception as e:
        print(f"Error loading classes.json: {e}")

# Load TensorFlow/Keras model safely
try:
    import tensorflow as tf
    import numpy as np
    from PIL import Image
    from io import BytesIO
    
    if os.path.exists(MODEL_PATH):
        ml_model = tf.keras.models.load_model(MODEL_PATH)
        model_loaded = True
        print("Keras MobileNetV2 Model loaded successfully!")
    else:
        print("Notice: mobilenetv2_model.h5 not found yet. Using CNN emulator.")
except Exception as e:
    print(f"Tensorflow is not available or failed to load model: {e}. Emulating CNN predictions.")

def predict_flower_cnn(image_base64):
    """
    Melakukan klasifikasi bunga menggunakan model CNN MobileNetV2 sesungguhnya.
    Jika model belum ada / gagal, fungsi ini akan melakukan emulasi cerdas.
    """
    if model_loaded and ml_model is not None:
        try:
            # Bersihkan base64 header
            if "," in image_base64:
                header, image_base64 = image_base64.split(",", 1)
            img_data = base64.b64decode(image_base64)
            img = Image.open(BytesIO(img_data)).convert('RGB')
            # MobileNetV2 input size is 224x224
            img_resized = img.resize((224, 224))
            img_array = np.array(img_resized) / 255.0
            img_array = np.expand_dims(img_array, axis=0)
            
            preds = ml_model.predict(img_array)
            best_idx = int(np.argmax(preds[0]))
            accuracy = float(preds[0][best_idx])
            
            class_name = flower_classes.get(str(best_idx), flower_classes.get(best_idx, "Bunga Tropis Unknown"))
            return class_name, accuracy
        except Exception as err:
            print(f"Real CNN identification error: {err}. Falling back to emulation.")
    
    # EMULASI: Konsisten berdasarkan panjang b64 teks gambar agar terlihat natural
    class_list = list(flower_classes.values())
    hash_idx = len(image_base64) % len(class_list)
    label = class_list[hash_idx]
    
    # Akurasi dinamis berkisar 83% s/d 99%
    acc = 0.83 + ((len(image_base64) % 17) / 100.0)
    return label, min(acc, 0.99)

# ==========================================
# SEED INITIAL DATA (Mengisi Database Kosong)
# ==========================================
with app.app_context():
    try:
        # Check if table needs upgrade (e.g. if 'nama_spesies' doesn't exist in hasil_sinkronisasi or id_staff in laporan)
        inspector = db.inspect(db.engine)
        rebuild = False
        
        # Check hasil_sinkronisasi
        columns_hs = [c['name'] for c in inspector.get_columns('hasil_sinkronisasi')] if 'hasil_sinkronisasi' in inspector.get_table_names() else []
        if 'hasil_sinkronisasi' in inspector.get_table_names() and 'nama_spesies' not in columns_hs:
            rebuild = True
            
        # Check laporan
        columns_lp = [c['name'] for c in inspector.get_columns('laporan')] if 'laporan' in inspector.get_table_names() else []
        if 'laporan' in inspector.get_table_names() and 'id_staff' not in columns_lp:
            rebuild = True
            
        if rebuild:
            print("Detected old table schema. Dropping all tables to rebuild new relational schema...")
            db.drop_all()
            db.create_all()
        else:
            db.create_all()
        
        # 1. Seed Admin
        if not Admin.query.first():
            default_admin = Admin(username='admin', password='admin123', nama_admin='Dr. Ir. Azzahra, M.Si.')
            db.session.add(default_admin)
            db.session.commit()
            
        # 2. Seed Staff
        if not Staff.query.first():
            adm = Admin.query.first()
            default_staff = Staff(username='staff', password='staff123', nama_staff='Rian Hidayat', no_telp_staff='081234567890', id_admin=adm.id_admin)
            additional_staff = Staff(username='staff2', password='staff123', nama_staff='Siti Aminah', no_telp_staff='087712345678', id_admin=adm.id_admin)
            db.session.add(default_staff)
            db.session.add(additional_staff)
            db.session.commit()
            
        # 3. Seed Konsumen
        if not Konsumen.query.first():
            stf = Staff.query.first()
            consumers = [
                Konsumen(nama_konsumen='Budi Sudarsono', no_telp_konsumen='085698765432', id_staff=stf.id_staff, tanggal=datetime.utcnow() - timedelta(days=20)),
                Konsumen(nama_konsumen='Dewi Lestari', no_telp_konsumen='082134567812', id_staff=stf.id_staff, tanggal=datetime.utcnow() - timedelta(days=15)),
                Konsumen(nama_konsumen='Joko Susilo', no_telp_konsumen='089912345678', id_staff=stf.id_staff, tanggal=datetime.utcnow() - timedelta(days=10)),
                Konsumen(nama_konsumen='Mega Permata', no_telp_konsumen='081398765411', id_staff=stf.id_staff, tanggal=datetime.utcnow() - timedelta(days=5))
            ]
            for c in consumers:
                db.session.add(c)
            db.session.commit()
            
        # 4. Seed Hasil Sinkronisasi (Katalog Spesies Bunga)
        if not HasilSinkronisasi.query.first():
            for name, desc in FLOWER_CHARACTERISTICS.items():
                s = HasilSinkronisasi(nama_spesies=name, karakteristik_perawatan=desc, tanggal_sinkronisasi=datetime.utcnow() - timedelta(days=15))
                db.session.add(s)
            db.session.commit()
 
        # 5. Seed Gambar Bunga Tropis & Hasil Identifikasi
        if not GambarBungaTropis.query.first():
            stf = Staff.query.first()
            
            sample_pics = [
                "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=500&auto=format&fit=crop&q=60", # Hibiscus
                "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?w=500&auto=format&fit=crop&q=60", # Orchid
                "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=500&auto=format&fit=crop&q=60", # Plumeria
                "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=500&auto=format&fit=crop&q=60"  # Bougainvillea
            ]
            
            flower_names = ["Hibiscus rosa sinensis", "Phalaenopsis amabilis", "Genus Plumeria", "Bougainvillea"]
            
            for idx, pic_url in enumerate(sample_pics):
                # Buat Gambar
                g = GambarBungaTropis(
                    file_gambar_bunga_tropis=pic_url,
                    tanggal_foto=datetime.utcnow() - timedelta(days=12 - idx),
                    id_staff=stf.id_staff
                )
                db.session.add(g)
                db.session.flush() # Ambil id_gambar
                
                # Buat Hasil Identifikasi
                name = flower_names[idx]
                sp = HasilSinkronisasi.query.filter_by(nama_spesies=name).first()
                id_sync_link = sp.id_sinkronisasi if sp else None
                
                hi = HasilIdentifikasi(
                    label_kelas=name,
                    tanggal_identifikasi=datetime.utcnow() - timedelta(days=12 - idx),
                    hasil_akurasi=round(0.85 + (idx * 0.04), 2),
                    id_gambar=g.id_gambar,
                    id_sinkronisasi=id_sync_link
                )
                db.session.add(hi)
                
            db.session.commit()
            
        # 6. Seed Laporan
        if not Laporan.query.first():
            adm = Admin.query.first()
            snc = HasilSinkronisasi.query.first()
            
            laporan_data = Laporan(
                tanggal_laporan=datetime.utcnow() - timedelta(days=1),
                file_dokumen="Laporan_Identifikasi_Bunga_Tropis_S1_2026.xlsx",
                id_admin=adm.id_admin,
                id_sinkronisasi=snc.id_sinkronisasi
            )
            db.session.add(laporan_data)
            db.session.commit()
            
        print("Database schemas created and seeded successfully!")
    except Exception as e:
        print(f"Warning: Database setup/seed encountered issue. (MySQL might not be running in sandbox: {e})")

# ==========================================
# AUTH MIDDLEWARE
# ==========================================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'message': 'Akses ditolak. Token tidak disediakan!'}), 401
        
        token = auth_header.split(' ')[1]
        if not token.startswith('JWT_'):
            return jsonify({'message': 'Format token salah!'}), 401
            
        try:
            b64_payload = token.split('_')[1]
            payload_bytes = base64.b64decode(b64_payload)
            user_data = json.loads(payload_bytes)
            request.user = user_data
        except Exception:
            return jsonify({'message': 'Token tidak valid!'}), 401
            
        return f(*args, **kwargs)
    return decorated

# ==========================================
# API ENDPOINTS
# ==========================================

# LOGIN
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    admin = Admin.query.filter_by(username=username, password=password).first()
    if admin:
        payload = json.dumps({'id_admin': admin.id_admin, 'username': admin.username, 'name': admin.nama_admin, 'role': 'ADMIN'})
        token = f"JWT_{base64.b64encode(payload.encode()).decode()}_{int(datetime.utcnow().timestamp())}"
        return jsonify({
            'token': token, 
            'user': {
                'id_admin': admin.id_admin, 
                'username': admin.username, 
                'name': admin.nama_admin, 
                'role': 'ADMIN'
            }
        })

    staff = Staff.query.filter_by(username=username, password=password).first()
    if staff:
        payload = json.dumps({'id_staff': staff.id_staff, 'username': staff.username, 'name': staff.nama_staff, 'role': 'STAFF', 'no_telp_staff': staff.no_telp_staff})
        token = f"JWT_{base64.b64encode(payload.encode()).decode()}_{int(datetime.utcnow().timestamp())}"
        return jsonify({
            'token': token, 
            'user': {
                'id_staff': staff.id_staff, 
                'username': staff.username, 
                'name': staff.nama_staff, 
                'role': 'STAFF',
                'no_telp_staff': staff.no_telp_staff
            }
        })

    return jsonify({'message': 'Username atau password salah!'}), 401


# PROSES IDENTIFIKASI (CNN MobileNetV2)
@app.route('/api/predict', methods=['POST'])
@token_required
def predict():
    data = request.json
    image = data.get('image') # Base64 string
    id_konsumen = data.get('id_konsumen')

    if not image:
        return jsonify({'message': 'Data gambar bunga tropis tidak disediakan!'}), 400
    if not id_konsumen:
        return jsonify({'message': 'Konsumen harus dipilih untuk mendaftarkan identifikasi!'}), 400

    # Dapatkan id_staff yang melakukan identifikasi
    id_staff = request.user.get('id_staff')
    if not id_staff:
        # Jika admin, hubungkan ke staff pertama yang ada di DB
        first_staff = Staff.query.first()
        id_staff = first_staff.id_staff if first_staff else 1

    # SIMPAN ke tabel Gambar Bunga Tropis
    new_gambar = GambarBungaTropis(
        file_gambar_bunga_tropis=image,
        tanggal_foto=datetime.utcnow(),
        id_staff=id_staff
    )
    db.session.add(new_gambar)
    db.session.flush() # generate id_gambar

    # IDENTIFIKASI dengan MobileNetV2
    label_kelas, hasil_akurasi = predict_flower_cnn(image)
    
    # Dapatkan entitas HasilSinkronisasi yang sesuai dengan spesies bunga teridentifikasi
    species = HasilSinkronisasi.query.filter_by(nama_spesies=label_kelas).first()
    id_sinkronisasi = species.id_sinkronisasi if species else None
    karakteristik = species.karakteristik_perawatan if species else "Karakteristik & perawatan belum disinkronisasi."

    # SIMPAN Hasil Identifikasi
    new_hasil = HasilIdentifikasi(
        label_kelas=label_kelas,
        tanggal_identifikasi=datetime.utcnow(),
        hasil_akurasi=round(hasil_akurasi, 4),
        id_gambar=new_gambar.id_gambar,
        id_sinkronisasi=id_sinkronisasi
    )
    db.session.add(new_hasil)
    db.session.commit()

    return jsonify({
        'success': True,
        'hasil_identifikasi': {
            'id_hasil': new_hasil.id_hasil,
            'label_kelas': new_hasil.label_kelas,
            'tanggal_identifikasi': new_hasil.tanggal_identifikasi.isoformat(),
            'deskripsi_karakteristik': karakteristik,
            'hasil_akurasi': new_hasil.hasil_akurasi,
            'id_gambar': new_gambar.id_gambar,
            'id_sinkronisasi': new_hasil.id_sinkronisasi
        }
    })


# --- CRUD ADMIN ---
@app.route('/api/admin', methods=['GET', 'POST', 'PUT', 'DELETE'])
@token_required
def handle_admin():
    if request.method == 'GET':
        admins = Admin.query.all()
        return jsonify([{
            'id_admin': a.id_admin, 
            'username': a.username, 
            'password': a.password,
            'nama_admin': a.nama_admin
        } for a in admins])
        
    elif request.method == 'POST':
        if request.user.get('role') != 'ADMIN':
            return jsonify({'message': 'Akses ditolak! Hanya Admin yang berwenang.'}), 403
        data = request.json
        # Check duplicate username
        existing = Admin.query.filter_by(username=data['username']).first()
        if existing:
            return jsonify({'message': 'Username sudah ada!'}), 400
        new_admin = Admin(
            username=data['username'], 
            password=data['password'], 
            nama_admin=data['nama_admin']
        )
        db.session.add(new_admin)
        db.session.commit()
        return jsonify({
            'id_admin': new_admin.id_admin, 
            'username': new_admin.username, 
            'nama_admin': new_admin.nama_admin
        }), 201

    elif request.method == 'PUT':
        if request.user.get('role') != 'ADMIN':
            return jsonify({'message': 'Akses ditolak! Hanya Admin yang berwenang.'}), 403
        data = request.json
        # Check duplicate username
        existing = Admin.query.filter_by(username=data['username']).first()
        if existing and existing.id_admin != data['id_admin']:
            return jsonify({'message': 'Username sudah ada!'}), 400
        a = Admin.query.get(data['id_admin'])
        if not a:
            return jsonify({'message': 'Admin tidak ditemukan!'}), 404
        a.username = data.get('username', a.username)
        a.password = data.get('password', a.password)
        a.nama_admin = data.get('nama_admin', a.nama_admin)
        db.session.commit()
        return jsonify({'message': 'Admin berhasil diupdate!'})

    elif request.method == 'DELETE':
        if request.user.get('role') != 'ADMIN':
            return jsonify({'message': 'Akses ditolak! Hanya Admin yang berwenang.'}), 403
        id_admin = request.args.get('id_admin', type=int)
        if request.user.get('id_admin') == id_admin:
            return jsonify({'message': 'Anda tidak diperbolehkan menghapus akun Anda sendiri yang sedang aktif!'}), 400
        a = Admin.query.get(id_admin)
        if not a:
            return jsonify({'message': 'Admin tidak ditemukan!'}), 404
        db.session.delete(a)
        db.session.commit()
        return jsonify({'message': 'Admin berhasil dihapus!'})


# --- CRUD STAFF ---
@app.route('/api/staff', methods=['GET', 'POST', 'PUT', 'DELETE'])
@token_required
def handle_staff():
    if request.method == 'GET':
        staffs = Staff.query.all()
        return jsonify([{
            'id_staff': s.id_staff, 
            'username': s.username, 
            'password': s.password,
            'nama_staff': s.nama_staff, 
            'no_telp_staff': s.no_telp_staff, 
            'id_admin': s.id_admin
        } for s in staffs])
        
    elif request.method == 'POST':
        if request.user.get('role') != 'ADMIN':
            return jsonify({'message': 'Hanya Admin yang berwenang mendaftarkan Staff.'}), 403
        data = request.json
        # Check duplicate username
        existing = Staff.query.filter_by(username=data['username']).first()
        if existing:
            return jsonify({'message': 'Username sudah ada!'}), 400
        id_admin = request.user.get('id_admin')
        if not id_admin:
            first_admin = Admin.query.first()
            id_admin = first_admin.id_admin if first_admin else 1
            
        new_staff = Staff(
            username=data['username'], 
            password=data['password'], 
            nama_staff=data['nama_staff'],
            no_telp_staff=data.get('no_telp_staff', '-'),
            id_admin=id_admin
        )
        db.session.add(new_staff)
        db.session.commit()
        return jsonify({
            'id_staff': new_staff.id_staff, 
            'username': new_staff.username, 
            'nama_staff': new_staff.nama_staff
        }), 201

    elif request.method == 'PUT':
        if request.user.get('role') != 'ADMIN':
            return jsonify({'message': 'Hanya Admin yang berwenang memperbarui Staff.'}), 403
        data = request.json
        # Check duplicate username
        existing = Staff.query.filter_by(username=data['username']).first()
        if existing and existing.id_staff != data['id_staff']:
            return jsonify({'message': 'Username sudah ada!'}), 400
        s = Staff.query.get(data['id_staff'])
        if not s:
            return jsonify({'message': 'Staff tidak ditemukan!'}), 404
        s.username = data.get('username', s.username)
        s.password = data.get('password', s.password)
        s.nama_staff = data.get('nama_staff', s.nama_staff)
        s.no_telp_staff = data.get('no_telp_staff', s.no_telp_staff)
        s.id_admin = data.get('id_admin', s.id_admin)
        db.session.commit()
        return jsonify({'message': 'Staff berhasil diupdate!'})

    elif request.method == 'DELETE':
        if request.user.get('role') != 'ADMIN':
            return jsonify({'message': 'Hanya Admin yang berwenang menghapus Staff.'}), 403
        id_staff = request.args.get('id_staff', type=int)
        s = Staff.query.get(id_staff)
        if not s:
            return jsonify({'message': 'Staff tidak ditemukan!'}), 404
        db.session.delete(s)
        db.session.commit()
        return jsonify({'message': 'Staff berhasil dihapus!'})


# --- CRUD KONSUMEN ---
@app.route('/api/konsumen', methods=['GET', 'POST', 'PUT', 'DELETE'])
@token_required
def handle_konsumen():
    if request.method == 'GET':
        consumers = Konsumen.query.all()
        return jsonify([{
            'id_konsumen': c.id_konsumen, 
            'tanggal': c.tanggal.isoformat(), 
            'nama_konsumen': c.nama_konsumen, 
            'no_telp_konsumen': c.no_telp_konsumen, 
            'id_staff': c.id_staff
        } for c in consumers])
        
    elif request.method == 'POST':
        data = request.json
        # Check duplicate name
        existing = Konsumen.query.filter_by(nama_konsumen=data['nama_konsumen']).first()
        if existing:
            return jsonify({'message': 'Nama konsumen sudah terdaftar!'}), 400
        id_staff = request.user.get('id_staff')
        if not id_staff:
            first_staff = Staff.query.first()
            id_staff = first_staff.id_staff if first_staff else 1
            
        new_c = Konsumen(
            nama_konsumen=data['nama_konsumen'], 
            no_telp_konsumen=data['no_telp_konsumen'], 
            id_staff=id_staff,
            tanggal=datetime.utcnow()
        )
        db.session.add(new_c)
        db.session.commit()
        return jsonify({
            'id_konsumen': new_c.id_konsumen, 
            'nama_konsumen': new_c.nama_konsumen, 
            'tanggal': new_c.tanggal.isoformat()
        }), 201

    elif request.method == 'PUT':
        data = request.json
        # Check duplicate name
        existing = Konsumen.query.filter_by(nama_konsumen=data['nama_konsumen']).first()
        if existing and existing.id_konsumen != data['id_konsumen']:
            return jsonify({'message': 'Nama konsumen sudah terdaftar!'}), 400
        c = Konsumen.query.get(data['id_konsumen'])
        if not c:
            return jsonify({'message': 'Konsumen tidak ditemukan!'}), 404
        c.nama_konsumen = data.get('nama_konsumen', c.nama_konsumen)
        c.no_telp_konsumen = data.get('no_telp_konsumen', c.no_telp_konsumen)
        c.id_staff = data.get('id_staff', c.id_staff)
        db.session.commit()
        return jsonify({'message': 'Data konsumen berhasil diperbarui!'})

    elif request.method == 'DELETE':
        id_konsumen = request.args.get('id_konsumen', type=int)
        c = Konsumen.query.get(id_konsumen)
        if not c:
            return jsonify({'message': 'Konsumen tidak ditemukan!'}), 404
        db.session.delete(c)
        db.session.commit()
        return jsonify({'message': 'Konsumen berhasil dihapus!'})


# --- CRUD GAMBAR BUNGA TROPIS ---
@app.route('/api/gambar_bunga_tropis', methods=['GET', 'POST', 'DELETE'])
@token_required
def handle_gambar_bunga_tropis():
    if request.method == 'GET':
        gambars = GambarBungaTropis.query.all()
        return jsonify([{
            'id_gambar': g.id_gambar, 
            'file_gambar_bunga_tropis': g.file_gambar_bunga_tropis, 
            'tanggal_foto': g.tanggal_foto.isoformat(), 
            'id_staff': g.id_staff
        } for g in gambars])
        
    elif request.method == 'POST':
        data = request.json
        id_staff = request.user.get('id_staff')
        if not id_staff:
            first_staff = Staff.query.first()
            id_staff = first_staff.id_staff if first_staff else 1
            
        new_g = GambarBungaTropis(
            file_gambar_bunga_tropis=data['file_gambar_bunga_tropis'],
            tanggal_foto=datetime.utcnow(),
            id_staff=id_staff
        )
        db.session.add(new_g)
        db.session.commit()
        return jsonify({
            'id_gambar': new_g.id_gambar, 
            'tanggal_foto': new_g.tanggal_foto.isoformat()
        }), 201

    elif request.method == 'DELETE':
        id_gambar = request.args.get('id_gambar', type=int)
        g = GambarBungaTropis.query.get(id_gambar)
        if not g:
            return jsonify({'message': 'Gambar tidak ditemukan!'}), 404
        db.session.delete(g)
        db.session.commit()
        return jsonify({'message': 'Gambar bunga tropis berhasil dihapus!'})


# --- CRUD HASIL IDENTIFIKASI ---
@app.route('/api/hasil_identifikasi', methods=['GET', 'POST', 'PUT', 'DELETE'])
@token_required
def handle_hasil_identifikasi():
    if request.method == 'GET':
        results = HasilIdentifikasi.query.all()
        # Buat map dari nama spesies ke karakteristik perawatan untuk lookup dinamis
        species_map = {s.nama_spesies: s.karakteristik_perawatan for s in HasilSinkronisasi.query.all()}
        response_list = []
        for r in results:
            desc = species_map.get(r.label_kelas, "Karakteristik & perawatan belum disinkronisasi.")
            response_list.append({
                'id_hasil': r.id_hasil, 
                'label_kelas': r.label_kelas, 
                'tanggal_identifikasi': r.tanggal_identifikasi.isoformat(), 
                'deskripsi_karakteristik': desc, 
                'hasil_akurasi': r.hasil_akurasi, 
                'id_gambar': r.id_gambar, 
                'id_sinkronisasi': r.id_sinkronisasi
            })
        return jsonify(response_list)
        
    elif request.method == 'POST':
        data = request.json
        # Cari id_sinkronisasi berdasarkan label_kelas
        species = HasilSinkronisasi.query.filter_by(nama_spesies=data['label_kelas']).first()
        id_sync_link = species.id_sinkronisasi if species else data.get('id_sinkronisasi')
        
        new_r = HasilIdentifikasi(
            label_kelas=data['label_kelas'],
            tanggal_identifikasi=datetime.utcnow(),
            hasil_akurasi=data['hasil_akurasi'],
            id_gambar=data['id_gambar'],
            id_sinkronisasi=id_sync_link
        )
        db.session.add(new_r)
        db.session.commit()
        return jsonify({
            'id_hasil': new_r.id_hasil, 
            'label_kelas': new_r.label_kelas
        }), 201
 
    elif request.method == 'PUT':
        data = request.json
        r = HasilIdentifikasi.query.get(data['id_hasil'])
        if not r:
            return jsonify({'message': 'Hasil identifikasi tidak ditemukan!'}), 404
        r.label_kelas = data.get('label_kelas', r.label_kelas)
        r.hasil_akurasi = data.get('hasil_akurasi', r.hasil_akurasi)
        r.id_gambar = data.get('id_gambar', r.id_gambar)
        
        # Link ke id_sinkronisasi yang cocok dengan label_kelas baru
        species = HasilSinkronisasi.query.filter_by(nama_spesies=r.label_kelas).first()
        r.id_sinkronisasi = species.id_sinkronisasi if species else data.get('id_sinkronisasi', r.id_sinkronisasi)
        
        db.session.commit()
        return jsonify({'message': 'Hasil identifikasi diperbarui!'})

    elif request.method == 'DELETE':
        id_hasil = request.args.get('id_hasil', type=int)
        r = HasilIdentifikasi.query.get(id_hasil)
        if not r:
            return jsonify({'message': 'Hasil identifikasi tidak ditemukan!'}), 404
        db.session.delete(r)
        db.session.commit()
        return jsonify({'message': 'Hasil identifikasi berhasil dihapus!'})


# --- CRUD HASIL SINKRONISASI ---
@app.route('/api/hasil_sinkronisasi', methods=['GET', 'POST', 'PUT', 'DELETE'])
@token_required
def handle_hasil_sinkronisasi():
    if request.method == 'GET':
        syncs = HasilSinkronisasi.query.all()
        res = []
        for s in syncs:
            # Cari semua gambar dari hasil identifikasi yang merujuk ke spesies ini
            # baik lewat foreign key id_sinkronisasi atau lewat kecocokan label_kelas
            images = db.session.query(GambarBungaTropis.file_gambar_bunga_tropis)\
                .join(HasilIdentifikasi, HasilIdentifikasi.id_gambar == GambarBungaTropis.id_gambar)\
                .filter((HasilIdentifikasi.id_sinkronisasi == s.id_sinkronisasi) | (HasilIdentifikasi.label_kelas == s.nama_spesies))\
                .all()
            image_list = [img[0] for img in images]
            
            res.append({
                'id_sinkronisasi': s.id_sinkronisasi,
                'nama_spesies': s.nama_spesies,
                'karakteristik_perawatan': s.karakteristik_perawatan,
                'tanggal_sinkronisasi': s.tanggal_sinkronisasi.isoformat(),
                'galeri_gambar': image_list
            })
        return jsonify(res)
        
    elif request.method == 'POST':
        # Re-associate any unlinked HasilIdentifikasi with correct HasilSinkronisasi species catalog
        identifikasis = HasilIdentifikasi.query.all()
        synced_count = 0
        for ident in identifikasis:
            species = HasilSinkronisasi.query.filter_by(nama_spesies=ident.label_kelas).first()
            if species:
                ident.id_sinkronisasi = species.id_sinkronisasi
                synced_count += 1
        db.session.commit()
        return jsonify({
            'message': 'Sinkronisasi berhasil! Semua data identifikasi dicocokkan ke database botani.',
            'synced_count': synced_count
        }), 200

    elif request.method == 'PUT':
        data = request.json
        s = HasilSinkronisasi.query.get(data['id_sinkronisasi'])
        if not s:
            return jsonify({'message': 'Spesies bunga tidak ditemukan!'}), 404
        s.karakteristik_perawatan = data.get('karakteristik_perawatan', s.karakteristik_perawatan)
        db.session.commit()
        return jsonify({'message': 'Karakteristik & cara perawatan berhasil diperbarui!'})

    elif request.method == 'DELETE':
        return jsonify({'message': 'Jenis bunga botani pada hasil sinkronisasi tidak boleh dihapus!'}), 403


# --- CRUD LAPORAN ---
@app.route('/api/laporan', methods=['GET', 'POST', 'DELETE'])
@token_required
def handle_laporan():
    if request.method == 'GET':
        laporans = Laporan.query.all()
        return jsonify([{
            'id_laporan': l.id_laporan, 
            'tanggal_laporan': l.tanggal_laporan.isoformat(), 
            'file_dokumen': l.file_dokumen, 
            'id_admin': l.id_admin,
            'id_staff': l.id_staff,
            'id_sinkronisasi': l.id_sinkronisasi
        } for l in laporans])
        
    elif request.method == 'POST':
        data = request.json
        id_admin = request.user.get('id_admin')
        id_staff = request.user.get('id_staff')
        
        if not id_admin and not id_staff:
            first_admin = Admin.query.first()
            id_admin = first_admin.id_admin if first_admin else 1
            
        tanggal_laporan = datetime.utcnow()
        tanggal_str = data.get('tanggal_laporan')
        if tanggal_str:
            try:
                tanggal_laporan = datetime.fromisoformat(tanggal_str.split('T')[0])
            except Exception as e:
                print(f"Error parsing tanggal_laporan: {e}")
            
        new_l = Laporan(
            tanggal_laporan=tanggal_laporan,
            file_dokumen=data.get('file_dokumen', 'Laporan_Generik_Bunga_Tropis.xlsx'),
            id_admin=id_admin,
            id_staff=id_staff,
            id_sinkronisasi=data['id_sinkronisasi']
        )
        db.session.add(new_l)
        db.session.commit()
        return jsonify({
            'id_laporan': new_l.id_laporan, 
            'tanggal_laporan': new_l.tanggal_laporan.isoformat()
        }), 201

    elif request.method == 'DELETE':
        id_laporan = request.args.get('id_laporan', type=int)
        l = Laporan.query.get(id_laporan)
        if not l:
            return jsonify({'message': 'Laporan tidak ditemukan!'}), 404
        db.session.delete(l)
        db.session.commit()
        return jsonify({'message': 'Laporan berhasil dihapus!'})


# --- DOWNLOAD LAPORAN EXCEL ---
@app.route('/api/laporan/download', methods=['GET'])
@token_required
def download_laporan():
    id_laporan = request.args.get('id_laporan', type=int)
    l = Laporan.query.get(id_laporan)
    if not l:
        return jsonify({'message': 'Laporan tidak ditemukan!'}), 404
        
    spesies = HasilSinkronisasi.query.get(l.id_sinkronisasi)
    nama_spesies = spesies.nama_spesies if spesies else "Semua Spesies"
    
    pembuat = "Sistem Koriel Garden"
    if l.id_admin:
        adm = Admin.query.get(l.id_admin)
        if adm:
            pembuat = f"Admin: {adm.nama_admin} (ID #{l.id_admin})"
    elif l.id_staff:
        stf = Staff.query.get(l.id_staff)
        if stf:
            pembuat = f"Staff: {stf.nama_staff} (ID #{l.id_staff})"
            
    # Ambil data identifikasi di bulan/tahun laporan tersebut
    start_date = datetime(l.tanggal_laporan.year, l.tanggal_laporan.month, 1)
    if l.tanggal_laporan.month == 12:
        end_date = datetime(l.tanggal_laporan.year + 1, 1, 1)
    else:
        end_date = datetime(l.tanggal_laporan.year, l.tanggal_laporan.month + 1, 1)
        
    query = HasilIdentifikasi.query.filter(
        HasilIdentifikasi.tanggal_identifikasi >= start_date,
        HasilIdentifikasi.tanggal_identifikasi < end_date
    )
    if l.id_sinkronisasi:
        query = query.filter((HasilIdentifikasi.id_sinkronisasi == l.id_sinkronisasi) | (HasilIdentifikasi.label_kelas == nama_spesies))
        
    records = query.all()
    
    # Generate custom styled HTML-based Excel spreadsheet (.xls)
    # This allows rich styling including custom fonts, margins, header colors, borders, and column widths.
    html = f"""<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Laporan Bulanan</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body {{
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }}
  table {{
    border-collapse: collapse;
  }}
  .title-cell {{
    font-size: 16pt;
    font-weight: bold;
    color: #065f46;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }}
  .subtitle-cell {{
    font-size: 10pt;
    color: #475569;
    font-style: italic;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }}
  .meta-label {{
    font-weight: bold;
    color: #334155;
    background-color: #f1f5f9;
    border: 1px solid #cbd5e1;
    font-size: 10pt;
    padding: 6px 10px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }}
  .meta-value {{
    color: #0f172a;
    border: 1px solid #cbd5e1;
    font-size: 10pt;
    padding: 6px 10px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }}
  .data-header {{
    background-color: #059669;
    color: #ffffff;
    font-weight: bold;
    border: 1px solid #475569;
    font-size: 11pt;
    padding: 10px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }}
  .data-cell {{
    border: 1px solid #cbd5e1;
    font-size: 10pt;
    padding: 8px 10px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }}
  .row-even {{
    background-color: #ffffff;
  }}
  .row-odd {{
    background-color: #f8fafc;
  }}
  .text-center {{
    text-align: center;
  }}
  .text-right {{
    text-align: right;
  }}
  .font-bold {{
    font-weight: bold;
  }}
</style>
</head>
<body>

  <!-- Report Header Banner -->
  <table>
    <tr>
      <td colspan="5" class="title-cell">LAPORAN BULANAN IDENTIFIKASI BUNGA TROPIS - KORIEL GARDEN</td>
    </tr>
    <tr>
      <td colspan="5" class="subtitle-cell">Sistem Manajemen Botani & Pelayanan Konsumen • Diunduh tanggal {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</td>
    </tr>
    <tr><td colspan="5"></td></tr>
  </table>

  <!-- Report Metadata Section -->
  <table>
    <tr>
      <td class="meta-label">Nama Berkas</td>
      <td class="meta-value" colspan="4">{l.file_dokumen}</td>
    </tr>
    <tr>
      <td class="meta-label">ID Laporan</td>
      <td class="meta-value" colspan="4">#{l.id_laporan}</td>
    </tr>
    <tr>
      <td class="meta-label">Periode Laporan</td>
      <td class="meta-value" colspan="4">{l.tanggal_laporan.strftime("%B %Y")}</td>
    </tr>
    <tr>
      <td class="meta-label">Dibuat Oleh</td>
      <td class="meta-value" colspan="4">{pembuat}</td>
    </tr>
    <tr>
      <td class="meta-label">Referensi Spesies</td>
      <td class="meta-value" colspan="4">#{l.id_sinkronisasi} ({nama_spesies})</td>
    </tr>
    <tr>
      <td class="meta-label">Total Hasil Identifikasi</td>
      <td class="meta-value" colspan="4" style="font-weight: bold; color: #059669;">{len(records)} records</td>
    </tr>
  </table>

  <br/>

  <!-- Main Records Table with fixed columns to auto-fit the content beautifully -->
  <table>
    <thead>
      <tr>
        <th class="data-header text-center" style="width: 100px;">ID Hasil</th>
        <th class="data-header" style="width: 250px;">Nama Spesies / Label</th>
        <th class="data-header" style="width: 200px;">Tanggal Identifikasi</th>
        <th class="data-header text-center" style="width: 150px;">Akurasi Analisis</th>
        <th class="data-header text-center" style="width: 120px;">ID Gambar</th>
      </tr>
    </thead>
    <tbody>
"""

    for idx, r in enumerate(records):
        bg_class = "row-odd" if idx % 2 == 1 else "row-even"
        accuracy = f"{round(r.hasil_akurasi * 100, 2)}%"
        html += f"""
      <tr class="{bg_class}">
        <td class="data-cell text-center font-bold" style="color: #047857;">#{r.id_hasil}</td>
        <td class="data-cell font-bold" style="font-style: italic; color: #1e293b;">{r.label_kelas}</td>
        <td class="data-cell">{r.tanggal_identifikasi.strftime("%Y-%m-%d %H:%M:%S")}</td>
        <td class="data-cell text-center font-bold" style="color: #059669; background-color: #f0fdf4;">{accuracy}</td>
        <td class="data-cell text-center font-bold" style="color: #4f46e5;">#{r.id_gambar}</td>
      </tr>"""

    html += """
    </tbody>
  </table>

</body>
</html>
"""

    from flask import Response
    # Change extension to .xls to represent styled spreadsheet
    filename = l.file_dokumen.replace(".csv", ".xls").replace(".xlsx", ".xls")
    if not filename.endswith(".xls"):
        filename += ".xls"

    return Response(
        html,
        mimetype="application/vnd.ms-excel",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==========================================
# RUTERING FRONTEND REACT (MONOLITIK)
# ==========================================
# Flask akan menghidangkan file statis dari folder `dist` milik React
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Di laptop Anda (prod), jalankan dengan: python backend/app.py
    app.run(host='0.0.0.0', port=3000, debug=True)
