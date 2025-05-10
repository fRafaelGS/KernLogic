@echo off
python manage.py shell < check_price_orgs.py > price_orgs_output.txt
type price_orgs_output.txt 