from flask import Flask, render_template, jsonify, request
from pathlib import Path
import csv

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
MASTER = []  # CSVから読み込んだマスターのリスト


def load_master():
    """master_items.csv を読み込んで MASTER に展開する"""
    global MASTER
    MASTER = []

    csv_path = BASE_DIR / "master_items.csv"
    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # 空白を削っておく（コード系での比較が安定）
            row["major_code"] = row.get("major_code", "").strip()
            row["major_name"] = row.get("major_name", "").strip()
            row["sub_code"] = row.get("sub_code", "").strip()
            row["sub_name"] = row.get("sub_name", "").strip()
            row["detail_code"] = row.get("detail_code", "").strip()
            row["detail_name"] = row.get("detail_name", "").strip()

            # unit_price は整数に変換（空なら 0）
            price_str = row.get("unit_price", "").strip()
            row["unit_price"] = int(price_str) if price_str else 0

            MASTER.append(row)


# アプリ起動時に読み込んでおく
load_master()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/majors")
def get_majors():
    """
    大項目一覧を返す（科目）
    例: [{"code": "01", "name": "映像企画関連費"}, ...]
    """
    majors = {}
    for row in MASTER:
        code = row["major_code"]
        name = row["major_name"]
        if code and code not in majors:
            majors[code] = name

    data = [{"code": c, "name": n} for c, n in majors.items()]
    return jsonify(data)


@app.route("/api/subs")
def get_subs():
    """
    指定された大項目に属する小項目一覧を返す
    クエリ: ?major_code=01
    例: [{"code": "50", "name": "アートディレクター費"}, ...]
    """
    major_code = (request.args.get("major_code") or "").strip()
    subs = {}

    for row in MASTER:
        if row["major_code"] == major_code:
            code = row["sub_code"]
            name = row["sub_name"]
            if code and code not in subs:
                subs[code] = name

    data = [{"code": c, "name": n} for c, n in subs.items()]
    return jsonify(data)


@app.route("/api/details")
def get_details():
    """
    指定された大項目＋小項目に属する詳細一覧を返す（摘要候補）
    クエリ: ?major_code=05&sub_code=50
    例: [
      {"code": "01", "name": "撮影用クレーン Crane", "unit_price": 150000},
      ...
    ]
    """
    major_code = (request.args.get("major_code") or "").strip()
    sub_code = (request.args.get("sub_code") or "").strip()

    details = []
    for row in MASTER:
        if row["major_code"] == major_code and row["sub_code"] == sub_code:
            details.append({
                "code": row["detail_code"],      # 摘要コード 01,02,...
                "name": row["detail_name"],      # 摘要（表示する文字列）
                "unit_price": row["unit_price"], # 単価
            })

    return jsonify(details)


if __name__ == "__main__":
    # ローカル開発用
    app.run(debug=True)
