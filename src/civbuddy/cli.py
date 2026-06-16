import asyncio
import argparse

from passlib.hash import bcrypt

from civbuddy.database import get_db, init_db


async def create_user(username: str, password: str, display_name: str):
    # Match the login path, which trims whitespace before verifying.
    username = username.strip()
    password = password.strip()
    await init_db()
    db = await get_db()
    try:
        pw_hash = bcrypt.hash(password)
        await db.execute(
            "INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)",
            (username, pw_hash, display_name),
        )
        await db.execute(
            "INSERT INTO presence (user_id, status) "
            "SELECT id, 'offline' FROM users WHERE username = ?",
            (username,),
        )
        await db.commit()
        print(f"Created user: {username} ({display_name})")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await db.close()


def main():
    parser = argparse.ArgumentParser(description="CivBuddy user management")
    parser.add_argument("username")
    parser.add_argument("password")
    parser.add_argument("--display-name", default=None)
    args = parser.parse_args()
    display_name = args.display_name or args.username
    asyncio.run(create_user(args.username, args.password, display_name))


if __name__ == "__main__":
    main()
