#!/usr/bin/env python3
"""
Migration script to add is_admin field to existing users
"""
import sqlite3
import os

def migrate_admin_field():
    db_path = "app.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if is_admin column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_admin' not in columns:
            print("Adding is_admin column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")
            conn.commit()
            print("✅ is_admin column added successfully")
        else:
            print("✅ is_admin column already exists")
        
        # Show current users
        cursor.execute("SELECT id, email, is_admin FROM users")
        users = cursor.fetchall()
        
        print(f"\nCurrent users ({len(users)} total):")
        for user_id, email, is_admin in users:
            admin_status = "ADMIN" if is_admin else "User"
            print(f"  {user_id}: {email} ({admin_status})")
        
        # Option to make a user admin
        if users:
            print("\nTo make a user admin, run:")
            print("UPDATE users SET is_admin = 1 WHERE email = 'user@example.com';")
            
            # Example: make the first user admin
            if len(users) == 1:
                user_email = users[0][1]
                print(f"\nMaking {user_email} admin...")
                cursor.execute("UPDATE users SET is_admin = 1 WHERE email = ?", (user_email,))
                conn.commit()
                print(f"✅ {user_email} is now an admin")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_admin_field()
