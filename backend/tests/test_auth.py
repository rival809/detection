from app.core.security import create_access_token, decode_token, hash_password, verify_password


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = hash_password("secret123")
        assert hashed != "secret123"

    def test_verify_correct_password(self):
        hashed = hash_password("secret123")
        assert verify_password("secret123", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("secret123")
        assert verify_password("wrongpass", hashed) is False

    def test_same_password_different_hash(self):
        # bcrypt salts every hash
        h1 = hash_password("secret123")
        h2 = hash_password("secret123")
        assert h1 != h2


class TestJWT:
    def test_create_and_decode(self):
        token = create_access_token("user@example.com")
        assert decode_token(token) == "user@example.com"

    def test_invalid_token_returns_none(self):
        assert decode_token("not.a.valid.token") is None

    def test_tampered_token_returns_none(self):
        token = create_access_token("user@example.com")
        tampered = token[:-5] + "XXXXX"
        assert decode_token(tampered) is None


class TestAuthEndpoints:
    def test_register_endpoint_removed(self, client):
        resp = client.post("/api/v1/auth/register", json={"email": "new@example.com", "password": "pass123"})
        assert resp.status_code == 404

    def test_login_success(self, client, db):
        from app.core.security import hash_password
        from app.db.models import User
        user = User(email="login@example.com", hashed_password=hash_password("pass123"))
        db.add(user)
        db.commit()
        resp = client.post("/api/v1/auth/login", json={"email": "login@example.com", "password": "pass123"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_wrong_password(self, client, db):
        from app.core.security import hash_password
        from app.db.models import User
        user = User(email="pw@example.com", hashed_password=hash_password("correctpass"))
        db.add(user)
        db.commit()
        resp = client.post("/api/v1/auth/login", json={"email": "pw@example.com", "password": "wrongpass"})
        assert resp.status_code == 401

    def test_protected_route_without_token(self, client):
        resp = client.get("/api/v1/videos")
        assert resp.status_code == 403

    def test_protected_route_with_token(self, client, auth_headers):
        resp = client.get("/api/v1/videos", headers=auth_headers)
        assert resp.status_code == 200
