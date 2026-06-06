Car Showroom Management - Transfer Notes

This folder contains the system files.

Important data file:
- database/postgres_showroom_db_20260606.dump

On the new computer:
1. Install PostgreSQL.
2. Create a database and user, or run setup_new_machine.py from this folder.
3. Restore the dump into PostgreSQL:
   pg_restore --clean --if-exists --no-owner --dbname=postgresql://USER:PASSWORD@localhost:5432/showroom_db database/postgres_showroom_db_20260606.dump
4. Make sure .env contains the correct DATABASE_URL for the new computer.
5. Install backend requirements:
   python -m pip install -r requirements.txt
6. Install frontend packages inside frontend:
   npm install
7. Start backend and frontend as usual.

Do not delete static/uploads because it contains uploaded car/customer files.
