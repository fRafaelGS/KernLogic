@echo off
python manage.py shell < check_org_ids.py > org_ids_output.txt
type org_ids_output.txt 