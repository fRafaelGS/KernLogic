@echo off
python manage.py shell < price_script.py > price_output.txt
type price_output.txt 