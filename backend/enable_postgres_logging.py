import psycopg2

# Connect to PostgreSQL
conn = psycopg2.connect(
    dbname='kernlogic_dev',
    user='postgres',  # Try with postgres superuser
    password='Nadaaver93!',
    host='localhost',
    port='8001'
)

# Ensure changes are committed immediately
conn.autocommit = True

# Create a cursor
cursor = conn.cursor()

try:
    # Set log_statement to 'mod' to log all modification statements
    cursor.execute("ALTER SYSTEM SET log_statement = 'mod';")
    print("Successfully set log_statement to 'mod'")
    
    # Reload the configuration
    cursor.execute("SELECT pg_reload_conf();")
    result = cursor.fetchone()
    if result[0]:
        print("Configuration successfully reloaded")
    else:
        print("Failed to reload configuration")
except Exception as e:
    print(f"Error: {e}")
finally:
    # Close cursor and connection
    cursor.close()
    conn.close()
    print("Connection closed") 