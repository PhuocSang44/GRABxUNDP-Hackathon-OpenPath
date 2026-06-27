# Backend

Đây là backend Python cho dự án, được tổ chức theo cấu trúc `app/` để tách rõ API, service, repository, model, schema, database và cấu hình lõi.

## Cài đặt

```bash
pip install -r requirements.txt
```

## Cấu trúc thư mục

- `app/api/`: khai báo router và các endpoint FastAPI.
- `app/services/`: chứa logic nghiệp vụ.
- `app/repositories/`: làm việc với dữ liệu và truy vấn.
- `app/models/`: định nghĩa model SQLAlchemy.
- `app/schemas/`: định nghĩa schema Pydantic cho request/response.
- `app/db/database.py`: cấu hình kết nối cơ sở dữ liệu.
- `app/core/`: cấu hình ứng dụng, settings, hằng số và tiện ích lõi.
- `app/main.py`: điểm khởi động ứng dụng FastAPI.

## Tác dụng của các package

- `fastapi`: framework web hiện đại để xây API nhanh, có type hints và tự sinh tài liệu OpenAPI.
- `uvicorn`: ASGI server để chạy ứng dụng FastAPI trong môi trường phát triển và production.
- `sqlalchemy`: ORM và bộ công cụ truy vấn cơ sở dữ liệu.
- `psycopg2-binary`: driver PostgreSQL để SQLAlchemy kết nối với PostgreSQL.
- `python-dotenv`: đọc biến môi trường từ file `.env`.
- `pydantic-settings`: quản lý cấu hình ứng dụng bằng Pydantic Settings, tiện cho `Settings`/`BaseSettings`.
- `alembic`: công cụ migration cho schema cơ sở dữ liệu.
- `supabase`: SDK để tích hợp với Supabase khi cần auth, storage, database hoặc API của Supabase.

## Chạy ứng dụng

Khi đã có `app/main.py`, có thể chạy backend bằng lệnh:

```bash
uvicorn app.main:app --reload
```
