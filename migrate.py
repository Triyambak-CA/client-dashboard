import psycopg2

SRC = "postgresql://postgres:OHcmLcdcywLpGAWNUePDhLqnNtAeaqnH@shuttle.proxy.rlwy.net:37056/railway"
DST = "postgresql://postgres:MyDB%402024@localhost:5432/ca_clients"

src = psycopg2.connect(SRC)
dst = psycopg2.connect(DST)
src.autocommit = True

src_cur = src.cursor()
dst_cur = dst.cursor()

src_cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
tables = [row[0] for row in src_cur.fetchall()]
print(f"Tables found: {tables}")

for table in tables:
    try:
        src_cur.execute(f"SELECT * FROM {table}")
        rows = src_cur.fetchall()
        if not rows:
            print(f"  {table}: empty, skipping")
            continue
        cols = [desc[0] for desc in src_cur.description]
        col_names = ",".join(cols)
        placeholders = ",".join(["%s"] * len(cols))
        count = 0
        for row in rows:
            try:
                dst_cur.execute(
                    f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING",
                    row
                )
                count += 1
            except Exception as e:
                dst.rollback()
                print(f"  {table} row error: {e}")
        dst.commit()
        print(f"  {table}: {count} rows copied")
    except Exception as e:
        dst.rollback()
        print(f"  {table}: ERROR - {e}")

src.close()
dst.close()
print("Done!")
